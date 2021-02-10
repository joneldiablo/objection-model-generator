const { Model } = require('objection');
const Knex = require('knex');
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');
const pluralize = require('pluralize');

module.exports = async (dbName, dbConnection, knexInstance, outputModelFile) => {
  const DB = dbName;
  // Initialize knex.
  const knex = Knex({
    client: 'mysql',
    connection: { ...dbConnection, database: 'information_schema' }
  });

  knex.on('query', data => {
    console.log('======== on query ==========');
    let i = 0;
    let sql = data.sql.replace(/\?/g, k => {
      return '"' + data.bindings[i++] + '"';
    });
    console.log(sql);
  });
  Model.knex(knex);

  class KeyColumnUsage extends Model {
    static get tableName() {
      return 'KEY_COLUMN_USAGE';
    }
  }

  class ColumnModel extends Model {
    static get tableName() {
      return 'COLUMNS';
    }
    static get relationMappings() {
      return {
        constrain: {
          relation: Model.BelongsToOneRelation,
          modelClass: KeyColumnUsage,
          filter: query => query.where('TABLE_SCHEMA', DB).whereNotNull('REFERENCED_COLUMN_NAME'),
          join: {
            from: ['COLUMNS.COLUMN_NAME', 'COLUMNS.TABLE_NAME'],
            to: ['KEY_COLUMN_USAGE.COLUMN_NAME', 'KEY_COLUMN_USAGE.TABLE_NAME']
          }
        }
      };
    }
  }

  class ViewModel extends Model {
    static get tableName() {
      return 'VIEWS';
    }
    static get relationMappings() {
      return {
        columns: {
          relation: Model.HasManyRelation,
          modelClass: ColumnModel,
          filter: query => query.where('TABLE_SCHEMA', DB),
          join: {
            from: 'VIEWS.TABLE_NAME',
            to: 'COLUMNS.TABLE_NAME'
          }
        }
      };
    }
  }

  const dataTypes = (type) => {
    /* 
     * Possible types in database
     * ================
     * varchar    bigint    longtext
     * datetime    int    tinyint
     * decimal    double    tinytext
     * text    timestamp    date
     * mediumtext    float    smallint
     * char    enum    blob
     * longblob    set 
     * 
     * Types available in json schema
     * string    number    object
     * array    boolean    null
     * integer    any
     * 
     */
    switch (type) {
      case 'varchar':
      case 'longtext':
      case 'tinytext':
      case 'text':
      case 'mediumtext':
      case 'char':
        return 'string';
      case 'date':
        return 'date';
      case 'datetime':
        return 'date-time';
      case 'bigint':
      case 'int':
      case 'tinyint':
      case 'smallint':
      case 'timestamp':
        return 'integer';
      case 'decimal':
      case 'double':
      case 'float':
        return 'number';
      default:
        return 'any';
    }
  };

  const searchFilter = (word) => {
    switch (word) {
      case 'old_password':
      case 'password':
      case 'token':
        return false
      default:
        return true;
    }
  };

  const singularize = (word) => {
    let words = word.toLowerCase().split(/[_\- ]/);
    return words.map(w => pluralize.singular(w)).join('-');
  };
  const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);
  const camelCase = (word) => word.toLowerCase()
    .replace(/[-_]([a-z0-9])/g, g => g[1].toUpperCase());

  let templateModelHeader = fs.readFileSync(path.join(__dirname, 'templates/modelHeaderTemplate.mustache'), 'UTF-8');
  let templateModel = fs.readFileSync(path.join(__dirname, 'templates/modelTemplate.mustache'), 'UTF-8');

  let models = Mustache.render(templateModelHeader, {
    dbFile: knexInstance
  });

  let views = await ViewModel.query().where('table_schema', '=', DB).eager('[columns.[constrain]]');
  let classModelNames = {
    classes: []
  };
  views.forEach(view => {
    let modelName = singularize(view.TABLE_NAME);
    modelName = camelCase(modelName);
    modelName = capitalize(modelName);
    let constrains = [];
    let requireds = [];
    let searches = [];
    let data = {
      modelName: modelName + 'Model',
      tableName: view.TABLE_NAME,
      properties: view.columns.map(column => {
        if (column.constrain) {
          constrains.push(column.constrain);
        }
        if (column.IS_NULLABLE === 'NO' && !column.COLUMN_DEFAULT && column.COLUMN_NAME !== 'id') {
          requireds.push(column.COLUMN_NAME);
        }
        let type = dataTypes(column.DATA_TYPE);
        if (type === 'string' && searchFilter(column.COLUMN_NAME)) {
          searches.push(column.COLUMN_NAME);
        }
        return {
          name: column.COLUMN_NAME,
          type: type
        }
      }),
      requireds,
      searches,
      relations: constrains.map(column => {
        let targetTableName = singularize(column.REFERENCED_TABLE_NAME);
        targetTableName = camelCase(targetTableName);
        return {
          name: targetTableName,
          column: column.COLUMN_NAME,
          targetModel: capitalize(targetTableName) + 'Model',
          targetTableName: column.REFERENCED_TABLE_NAME,
          targetColumn: column.REFERENCED_COLUMN_NAME
        }
      })
    }
    classModelNames.classes.push(data);
  });
  models += Mustache.render(templateModel, classModelNames);
  fs.writeFileSync(outputModelFile, models);
  return true;
}