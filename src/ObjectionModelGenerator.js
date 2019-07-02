import fs from 'fs-extra';
import path from 'path';
import pluralize from 'pluralize';
import Mustache from 'mustache';
import Knex from 'knex';
import {
  Model
} from 'objection';

import { version } from "../package.json";
import {
  KeyColumnUsage,
  TableModel
} from './models';
import { constants } from 'zlib';

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

export default class ObjectionModelGenerator {

  /**
   * 
   * @param {*} credentials 
   * @param {*} credentials.user
   * @param {*} credentials.password
   * @param {*} credentials.host
   * @param {*} credentials.port
   * @param {*} dbName 
   * @param {*} dbKnexObjectPath 
   * @param {*} outputFilePath 
   */
  constructor(credentials = {}, dbName, dbKnexObjectPath) {
    this.dbName = dbName;
    this.dbFile = dbKnexObjectPath;

    // Initialize knex.
    const knex = Knex({
      client: 'mysql',
      connection: {
        ...credentials,
        database: 'information_schema'
      }
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
  }

  async createFiles() {
    let {
      dbName,
      dbFile
    } = this;
    let pt = path.join(__dirname, '../templates/');
    let mht = path.join(pt, 'modelHeaderTemplate.mustache');
    let mt = path.join(pt, 'modelTemplate.mustache');
    let templateModelHeader = await fs.readFile(mht, 'UTF-8');
    let templateModel = await fs.readFile(mt, 'UTF-8');

    let models = Mustache.render(templateModelHeader, {
      dbFile
    });
    TableModel.dbName = dbName;
    let cns = await KeyColumnUsage.query()
      .whereNotNull('REFERENCED_COLUMN_NAME')
      .andWhere('table_schema', '=', dbName);
    let tables = await TableModel.query()
      .where('table_schema', '=', dbName)
      .eager('[columns]');
    let classModelNames = {
      classes: [],
      dbFile
    };
    tables.forEach(async table => {
      let modelName = singularize(table.TABLE_NAME);
      modelName = camelCase(modelName);
      modelName = capitalize(modelName);
      let constrains = [];
      let requireds = [];
      let searches = [];
      let data = {
        modelName: modelName + 'Model',
        tableName: table.TABLE_NAME,
        properties: table.columns.map(column => {
          constrains.push(...cns.filter(cn =>
            table.TABLE_NAME === cn.TABLE_NAME
            && column.COLUMN_NAME === cn.COLUMN_NAME));
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
    return models;
  };

  get version() {
    return version;
  }
}
