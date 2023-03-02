'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _pluralize = require('pluralize');

var _pluralize2 = _interopRequireDefault(_pluralize);

var _mustache = require('mustache');

var _mustache2 = _interopRequireDefault(_mustache);

var _knex = require('knex');

var _knex2 = _interopRequireDefault(_knex);

var _objection = require('objection');

var _package = require('../package.json');

var _models = require('./models');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var dataTypes = function dataTypes(_ref) {
  var dataType = _ref.DATA_TYPE,
      columnType = _ref.COLUMN_TYPE,
      isNullable = _ref.IS_NULLABLE;

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
  var toReturn = '';
  switch (dataType) {
    case 'varchar':
    case 'tinytext':
    case 'text':
    case 'mediumtext':
    case 'char':
    case 'enum':
    case 'date':
    case 'datetime':
      toReturn = 'string';
      break;
    case 'tinyint':
      if (columnType === 'tinyint(1) unsigned') toReturn = 'boolean';else toReturn = 'integer';
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
    case 'longtext':
    case 'json':
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

var dataFormats = function dataFormats(_ref2) {
  var dataType = _ref2.DATA_TYPE;

  switch (dataType) {
    case 'datetime':
      return 'date-time';
    case 'date':
    case 'time':
    //return dataType;
    default:
      break;
  }
};

var searchFilter = function searchFilter(word, column) {
  var exceptions = ['blob', 'longblob', 'longtext', 'time', 'datetime', 'date', 'json'];
  if (exceptions.includes(column.DATA_TYPE)) return false;
  if (word.includes('schema')) return false;
  switch (word) {
    case 'old_password':
    case 'password':
    case 'pass':
    case 'token':
    case 'created_at':
    case 'updated_at':
      return false;
    default:
      return true;
  }
};

var singularize = function singularize(word) {
  var words = word.toLowerCase().split(/[_\- ]/);
  return words.map(function (w) {
    return p7e.singular(w);
  }).join('-');
};

var capitalize = function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
};

var camelCase = function camelCase(word) {
  return word.toLowerCase().replace(/[-_]+/g, '-').replace(/-([a-z0-9])/g, function (g) {
    return g[1].toUpperCase();
  }).replace(/-([a-z0-9])/g, function (g) {
    return g[1].toUpperCase();
  }).replace(/-([a-z0-9])/g, function (g) {
    return g[1].toUpperCase();
  });
};

var p7e = _pluralize2.default;

var ObjectionModelGenerator = function () {

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
  function ObjectionModelGenerator() {
    var credentials = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var dbName = arguments[1];
    var dbKnexObjectPath = arguments[2];

    _classCallCheck(this, ObjectionModelGenerator);

    this.dbName = dbName;
    this.dbFile = dbKnexObjectPath;

    // Initialize knex.
    var knex = (0, _knex2.default)({
      client: 'mysql2',
      connection: _extends({}, credentials, {
        database: 'information_schema'
      })
    });

    knex.on('query', function (data) {
      console.log('======== on query ==========');
      var i = 0;
      var sql = data.sql.replace(/\?/g, function (k) {
        return '"' + data.bindings[i++] + '"';
      });
      console.log(sql);
    });
    _objection.Model.knex(knex);
  }

  _createClass(ObjectionModelGenerator, [{
    key: 'createModels',
    value: async function createModels(prefix) {
      var dbName = this.dbName,
          dbFile = this.dbFile;

      var pt = _path2.default.join(__dirname, '../templates/');
      var mht = _path2.default.join(pt, 'modelHeaderTemplate.mustache');
      var mt = _path2.default.join(pt, 'modelTemplate.mustache');
      var templateModelHeader = await _fsExtra2.default.readFile(mht, 'UTF-8');
      var templateModel = await _fsExtra2.default.readFile(mt, 'UTF-8');

      var models = _mustache2.default.render(templateModelHeader, {
        dbFile: dbFile
      });
      _models.TableModel.dbName = dbName;
      var cns = await _models.KeyColumnUsage.query().whereNotNull('REFERENCED_COLUMN_NAME').andWhere('table_schema', '=', dbName);
      var promiseTable = _models.TableModel.query().where('table_schema', '=', dbName);
      if (prefix) {
        promiseTable = promiseTable.andWhere('table_name', 'like', prefix + '%');
      }
      var tables = await promiseTable.eager('[columns]');

      var classModelNames = {
        classes: [],
        dbFile: dbFile
      };
      tables.forEach(async function (table) {
        var modelName = singularize(table.TABLE_NAME);
        modelName = camelCase(modelName);
        modelName = capitalize(modelName);
        var constrains = [];
        var requireds = [];
        var searches = [];
        var data = {
          modelName: modelName + 'Model',
          tableName: table.TABLE_NAME,
          properties: table.columns.map(function (column) {
            constrains.push.apply(constrains, _toConsumableArray(cns.filter(function (cn) {
              return table.TABLE_NAME === cn.TABLE_NAME && column.COLUMN_NAME === cn.COLUMN_NAME;
            })));
            if (column.IS_NULLABLE === 'NO' && !column.COLUMN_DEFAULT && column.COLUMN_NAME !== 'id') {
              requireds.push(column.COLUMN_NAME);
            }
            var type = dataTypes(column);
            var format = dataFormats(column);

            if (type.includes('string') && searchFilter(column.COLUMN_NAME, column)) {
              searches.push(column.COLUMN_NAME);
            }
            return {
              name: column.COLUMN_NAME,
              type: JSON.stringify(type),
              format: format,
              items: column.DATA_TYPE === 'enum' && column.COLUMN_TYPE.match(/enum\((.*)\)/)[1]
            };
          }),
          requireds: JSON.stringify(requireds),
          searches: JSON.stringify(searches),
          relations: constrains.map(function (column) {
            var referenced = singularize(column.REFERENCED_TABLE_NAME);
            var targetTableName = singularize(column.COLUMN_NAME.replace('_' + column.REFERENCED_COLUMN_NAME, ''));
            if (referenced != targetTableName) targetTableName = targetTableName + '_' + referenced;
            targetTableName = camelCase(targetTableName);
            referenced = camelCase(referenced);

            return {
              name: targetTableName,
              column: column.COLUMN_NAME,
              targetModel: capitalize(referenced) + 'Model',
              targetTableName: column.REFERENCED_TABLE_NAME,
              targetColumn: column.REFERENCED_COLUMN_NAME
            };
          })
        };
        classModelNames.classes.push(data);
      });
      models += _mustache2.default.render(templateModel, classModelNames);
      return models;
    }
  }, {
    key: 'pluralize',
    set: function set(p) {
      p7e = p;
    }
  }, {
    key: 'version',
    get: function get() {
      return _package.version;
    }
  }]);

  return ObjectionModelGenerator;
}();

exports.default = ObjectionModelGenerator;
module.exports = exports.default;
module.exports.default = exports.default;
//# sourceMappingURL=ObjectionModelGenerator.js.map