const { Model } = require('objection');
const Knex = require('knex');
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');
const pluralize = require('pluralize');

module.exports = async (dbName, dbConnection, modelsPath, controllerParent, pathControllers) => {
  const DB = dbName;
  // Initialize knex.
  const knex = Knex({
    client: 'mysql',
    connection: { ...dbConnection, database: 'information_schema' }
  });

  var check = await knex.raw('select 1+1 as result').catch(e=>({error: e}));
  if(check.error) {
    console.log(check.error);
    return false;
  }

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

  class TableModel extends Model {
    static get tableName() {
      return 'TABLES';
    }
    static get relationMappings() {
      return {
        columns: {
          relation: Model.HasManyRelation,
          modelClass: ColumnModel,
          filter: query => query.where('TABLE_SCHEMA', DB),
          join: {
            from: 'TABLES.TABLE_NAME',
            to: 'COLUMNS.TABLE_NAME'
          }
        }
      };
    }
  }

  const singularize = (word) => {
    let words = word.toLowerCase().split(/[_\- ]/);
    return words.map(w => pluralize.singular(w)).join('-');
  };
  const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1);
  const camelCase = (word) => word.toLowerCase()
    .replace(/[-_]([a-z0-9])/g, g => g[1].toUpperCase());

  let pathHeader = path.join(__dirname, 'templates/controllerHeaderTemplate.mustache');
  let templateControllerHeader = fs.readFileSync(pathHeader, 'UTF-8');
  let pathControllerTpl = path.join(__dirname, 'templates/controllerTemplate.mustache');
  let templateController = fs.readFileSync(pathControllerTpl, 'UTF-8');
  let headerController = Mustache.render(templateControllerHeader, {
    controllerParent,
    modelsPath
  });
  let tables = await TableModel.query().where('table_schema', '=', DB).eager('[columns.[constrain]]');
  tables.forEach(table => {
    let modelName = singularize(table.TABLE_NAME);
    modelName = camelCase(modelName);
    modelName = capitalize(modelName);

    let rels = table.columns.filter(col => !!col.constrain).map(col => {
      let targetTableName = singularize(col.constrain.REFERENCED_TABLE_NAME);
      targetTableName = camelCase(targetTableName);
      return targetTableName;
    }).join(', ');

    let controller = headerController;
    controller += Mustache.render(templateController, {
      model: modelName + 'Model',
      controller: modelName + 'Controller',
      rels,
    });
    fs.writeFileSync(`${pathControllers}/${modelName}Controller.js`, controller);
  });
}
