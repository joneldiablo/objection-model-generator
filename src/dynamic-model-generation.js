import Knex from 'knex';
import { Model, AjvValidator } from 'objection';
import addFormats from 'ajv-formats';
import pluralize from 'pluralize';
import fs from 'fs';
import path from 'path';

/**
 * Maps SQL data types to JSON Schema types.
 * @param {Object} column - The column definition from the database.
 * @returns {Object} JSON Schema type definition.
 */
function mapSqlTypeToJsonSchemaType(column) {
  const dataType = column.DATA_TYPE.toLowerCase();
  switch (dataType) {
    case 'varchar':
    case 'text':
    case 'char':
    case 'mediumtext':
    case 'longtext':
    case 'enum':
    case 'set':
    case 'date':
    case 'time':
    case 'datetime':
    case 'timestamp':
      return { type: 'string' };
    case 'tinyint':
    case 'smallint':
    case 'mediumint':
    case 'int':
    case 'bigint':
      return { type: column.COLUMN_TYPE.includes('unsigned') ? 'integer' : 'number' };
    case 'float':
    case 'double':
    case 'decimal':
      return { type: 'number' };
    case 'json':
      return { type: 'object' };
    case 'bit':
    case 'boolean':
      return { type: 'boolean' };
    case 'binary':
    case 'varbinary':
    case 'blob':
    case 'tinyblob':
    case 'mediumblob':
    case 'longblob':
      return { type: 'string', contentEncoding: 'base64' };
    default:
      return { type: 'string' };
  }
}

/**
 * Dynamically generates models based on the database schema.
 * @param {Object} knexConfig - Knex configuration object.
 * @param {string} dbName - Database name.
 * @returns {Function} An async function that returns the generated models.
 */
function generateDynamicModel(knexConfig, dbName) {
  const knex = Knex({
    ...knexConfig,
    connection: { ...knexConfig.connection, database: dbName }
  });

  Model.knex(knex);

  class BaseModel extends Model {
    $formatDatabaseJson(json) {
      json = super.$formatDatabaseJson(json);
      Object.keys(json).forEach(e => json[e] = (typeof json[e] === 'string' ? json[e].trim() : json[e]));
      return json;
    }

    static createValidator() {
      return new AjvValidator({
        onCreateAjv: (ajv) => {
          addFormats(ajv);
        }
      });
    }
  }

  return async () => {
    const tables = await knex('information_schema.tables')
      .where('table_schema', '=', dbName);

    const models = {};

    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      const columns = await knex('information_schema.columns')
        .where({ table_name: tableName, table_schema: dbName });
      
      const relations = await knex('information_schema.key_column_usage')
        .where({ table_name: tableName, table_schema: dbName })
        .andWhereNotNull('referenced_table_name');

      const jsonSchema = {
        type: 'object',
        properties: columns.reduce((props, column) => {
          props[column.COLUMN_NAME] = mapSqlTypeToJsonSchemaType(column);
          return props;
        }, {}),
        required: columns.filter(column => column.IS_NULLABLE === 'NO' && column.COLUMN_DEFAULT === null).map(column => column.COLUMN_NAME)
      };

      const modelName = pluralize.singular(tableName).replace(/_./g, char => char[1].toUpperCase());
      const ModelClass = class extends BaseModel {
        static get tableName() {
          return tableName;
        }

        static get jsonSchema() {
          return jsonSchema;
        }

        static get relationMappings() {
          const mappings = {};
          relations.forEach(relation => {
            const relationName = pluralize.singular(relation.REFERENCED_TABLE_NAME).replace(/_./g, char => char[1].toUpperCase());
            mappings[relationName] = {
              relation: Model.BelongsToOneRelation,
              modelClass: () => models[relationName],
              join: {
                from: `${tableName}.${relation.COLUMN_NAME}`,
                to: `${relation.REFERENCED_TABLE_NAME}.${relation.REFERENCED_COLUMN_NAME}`
              }
            };
          });
          return mappings;
        }
      };

      models[modelName] = ModelClass;
    }

    return models;
  };
}

/**
 * Exports JSON Schemas to files.
 * @param {Object} models - The generated models.
 * @param {string} directoryPath - The path to the directory where files will be saved.
 */
function exportJsonSchemas(models, directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  for (const [modelName, modelClass] of Object.entries(models)) {
    const schemaFilePath = path.join(directoryPath, `${modelName}Schema.json`);
    const schemaJson = JSON.stringify(modelClass.jsonSchema, null, 2);
    fs.writeFileSync(schemaFilePath, schemaJson, 'utf8');
  }
}

/**
 * Exports models to files.
 * @param {Object} models - The generated models.
 * @param {string} directoryPath - The path to the directory where files will be saved.
 */
function exportModels(models, directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  for (const [modelName, modelClass] of Object.entries(models)) {
    const modelFilePath = path.join(directoryPath, `${modelName}.js`);
    const modelContent = `const { Model } = require('objection');\n\n` +
                         `class ${modelName} extends Model {\n` +
                         `  static get tableName() {\n` +
                         `    return '${modelClass.tableName}';\n` +
                         `  }\n\n` +
                         `  static get jsonSchema() {\n` +
                         `    return ${JSON.stringify(modelClass.jsonSchema, null, 2)};\n` +
                         `  }\n` +
                         `}\n\n` +
                         `module.exports = ${modelName};\n`;

    fs.writeFileSync(modelFilePath, modelContent, 'utf8');
  }
}

// Example usage
const knexConfig = {
  client: 'mysql',
  connection: {
    host: 'your-host',
    user: 'your-user',
    password: 'your-password'
  }
};

const getModels = generateDynamicModel(knexConfig, 'your-database-name');

getModels().then(models => {
  // Example model usage
  // ...

  // Export JSON Schemas and Models
  exportJsonSchemas(models, './schemas');
  exportModels(models, './models');
});
