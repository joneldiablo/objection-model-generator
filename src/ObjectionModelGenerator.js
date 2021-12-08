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

const dataTypes = ({ DATA_TYPE: dataType, COLUMN_TYPE: columnType, IS_NULLABLE: isNullable }) => {
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
  let toReturn = '';
  switch (dataType) {
    case 'varchar':
    case 'longtext':
    case 'tinytext':
    case 'text':
    case 'mediumtext':
    case 'char':
    case 'enum':
      toReturn = 'string';
      break;
    case 'date':
      toReturn = 'date';
      break;
    case 'datetime':
      toReturn = 'date-time';
      break;
    case 'tinyint':
      if (columnType === 'tinyint(1) unsigned')
        toReturn = 'boolean';
      else toReturn = 'integer';
      break;
    case 'bigint':
    case 'int':
    case 'smallint':
    case 'timestamp':
      toReturn = 'integer';
      break;
    case 'decimal':
    case 'double':
    case 'float':
      toReturn = 'number';
      break;
    case 'blob':
    case 'longblob':
      toReturn = 'object';
      break;
    default:
      toReturn = 'any';
      break;
  }
  if (isNullable === 'YES') {
    return [toReturn, 'null'];
  }
  return toReturn;
};

const searchFilter = (word, column) => {
  if (['blob', 'longblob'].includes(column.DATA_TYPE)) return false;
  if (word.includes('schema')) return false;
  switch (word) {
    case 'old_password':
    case 'password':
    case 'pass':
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
  .replace(/[-_]+/, '-')
  .replace(/-([a-z0-9])/g, g => g[1].toUpperCase());

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

  async createModels(prefix) {
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
    let promiseTable = TableModel.query()
      .where('table_schema', '=', dbName);
    if (prefix) {
      promiseTable = promiseTable
        .andWhere('table_name', 'like', prefix + '%');
    }
    let tables = await promiseTable.eager('[columns]');


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
          let type = dataTypes(column);
          if (type.includes('string') && searchFilter(column.COLUMN_NAME, column)) {
            searches.push(column.COLUMN_NAME);
          }
          return {
            name: column.COLUMN_NAME,
            type: JSON.stringify(type),
            items: column.DATA_TYPE === 'enum' &&
              column.COLUMN_TYPE.match(/enum\((.*)\)/)[1]
          }
        }),
        requireds: JSON.stringify(requireds),
        searches: JSON.stringify(searches),
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
