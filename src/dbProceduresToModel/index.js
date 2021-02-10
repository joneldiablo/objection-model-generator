require('dotenv').config();

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

  class RoutinesModel extends Model {
    static get tableName() {
      return 'routines';
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

  let routines = await RoutinesModel.query().where('routine_schema', '=', DB).andWhere('routine_type', '=', 'PROCEDURE');
  let classModelNames = {
    classes: []
  };
  routines.forEach(routine => {
    let modelName = singularize(routine.ROUTINE_NAME);
    modelName = camelCase(modelName);
    modelName = capitalize(modelName);
    let requireds = [];
    let searches = [];
    let data = {
      modelName: modelName + 'Model',
      tableName: routine.ROUTINE_NAME,
      requireds,
      searches
    }
    classModelNames.classes.push(data);
  });
  models += Mustache.render(templateModel, classModelNames);
  fs.writeFileSync(outputModelFile, models);
}