const { Model } = require('objection');
const Knex = require('knex');
const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');
const pluralize = require('pluralize');

module.exports = async (dbName, dbConnection, fileNameRoutes) => {
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

  let templateRoutes = fs.readFileSync(path.join(__dirname, 'templates/routesTemplate.mustache'), 'UTF-8');
  let tables = await TableModel.query().where('table_schema', '=', DB).eager('[columns.[constrain]]');
  let routes = [];
  tables.forEach(table => {
    let name = singularize(table.TABLE_NAME);
    let routesPerController = [{
      route: `GET /${name}`,
      controller: `${capitalize(camelCase(name))}Controller.get`
    },
    {
      route: `GET /${name}/:ID`,
      controller: `${capitalize(camelCase(name))}Controller.getByID`
    },
    {
      route: `POST /${name}`,
      controller: `${capitalize(camelCase(name))}Controller.set`
    },
    {
      route: `PATCH /${name}/:ID`,
      controller: `${capitalize(camelCase(name))}Controller.update`
    },
    {
      route: `DELETE /${name}/:ID`,
      controller: `${capitalize(camelCase(name))}Controller.delete`
    }
    ]
    routes.push(...routesPerController);
  });
  routes.sort((a, b) => (a.route < b.route ? -1 : (a.route > b.route ? 1 : 0)));
  let rendered = Mustache.render(templateRoutes, {
    routes
  });
  fs.writeFileSync(fileNameRoutes, rendered);
}