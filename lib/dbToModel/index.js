'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('objection'),
    Model = _require.Model;

var Knex = require('knex');
var fs = require('fs');
var path = require('path');
var Mustache = require('mustache');
var pluralize = require('pluralize');

module.exports = async function (dbName, dbConnection, knexInstance, outputModelFile) {
  var DB = dbName;
  // Initialize knex.
  var knex = Knex({
    client: 'mysql',
    connection: _extends({}, dbConnection, { database: 'information_schema' })
  });

  knex.on('query', function (data) {
    console.log('======== on query ==========');
    var i = 0;
    var sql = data.sql.replace(/\?/g, function (k) {
      return '"' + data.bindings[i++] + '"';
    });
    console.log(sql);
  });
  Model.knex(knex);

  var KeyColumnUsage = function (_Model) {
    _inherits(KeyColumnUsage, _Model);

    function KeyColumnUsage() {
      _classCallCheck(this, KeyColumnUsage);

      return _possibleConstructorReturn(this, (KeyColumnUsage.__proto__ || Object.getPrototypeOf(KeyColumnUsage)).apply(this, arguments));
    }

    _createClass(KeyColumnUsage, null, [{
      key: 'tableName',
      get: function get() {
        return 'KEY_COLUMN_USAGE';
      }
    }]);

    return KeyColumnUsage;
  }(Model);

  var ColumnModel = function (_Model2) {
    _inherits(ColumnModel, _Model2);

    function ColumnModel() {
      _classCallCheck(this, ColumnModel);

      return _possibleConstructorReturn(this, (ColumnModel.__proto__ || Object.getPrototypeOf(ColumnModel)).apply(this, arguments));
    }

    _createClass(ColumnModel, null, [{
      key: 'tableName',
      get: function get() {
        return 'COLUMNS';
      }
    }, {
      key: 'relationMappings',
      get: function get() {
        return {
          constrain: {
            relation: Model.BelongsToOneRelation,
            modelClass: KeyColumnUsage,
            filter: function filter(query) {
              return query.where('TABLE_SCHEMA', DB).whereNotNull('REFERENCED_COLUMN_NAME');
            },
            join: {
              from: ['COLUMNS.COLUMN_NAME', 'COLUMNS.TABLE_NAME'],
              to: ['KEY_COLUMN_USAGE.COLUMN_NAME', 'KEY_COLUMN_USAGE.TABLE_NAME']
            }
          }
        };
      }
    }]);

    return ColumnModel;
  }(Model);

  var TableModel = function (_Model3) {
    _inherits(TableModel, _Model3);

    function TableModel() {
      _classCallCheck(this, TableModel);

      return _possibleConstructorReturn(this, (TableModel.__proto__ || Object.getPrototypeOf(TableModel)).apply(this, arguments));
    }

    _createClass(TableModel, null, [{
      key: 'tableName',
      get: function get() {
        return 'TABLES';
      }
    }, {
      key: 'relationMappings',
      get: function get() {
        return {
          columns: {
            relation: Model.HasManyRelation,
            modelClass: ColumnModel,
            filter: function filter(query) {
              return query.where('TABLE_SCHEMA', DB);
            },
            join: {
              from: 'TABLES.TABLE_NAME',
              to: 'COLUMNS.TABLE_NAME'
            }
          }
        };
      }
    }]);

    return TableModel;
  }(Model);

  var dataTypes = function dataTypes(type) {
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

  var searchFilter = function searchFilter(word) {
    switch (word) {
      case 'old_password':
      case 'password':
      case 'token':
        return false;
      default:
        return true;
    }
  };

  var singularize = function singularize(word) {
    var words = word.toLowerCase().split(/[_\- ]/);
    return words.map(function (w) {
      return pluralize.singular(w);
    }).join('-');
  };
  var capitalize = function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  };
  var camelCase = function camelCase(word) {
    return word.toLowerCase().replace(/[-_]([a-z0-9])/g, function (g) {
      return g[1].toUpperCase();
    });
  };

  var templateModelHeader = fs.readFileSync(path.join(__dirname, 'templates/modelHeaderTemplate.mustache'), 'UTF-8');
  var templateModel = fs.readFileSync(path.join(__dirname, 'templates/modelTemplate.mustache'), 'UTF-8');

  var models = Mustache.render(templateModelHeader, {
    dbFile: knexInstance
  });

  var tables = await TableModel.query().where('table_schema', '=', DB).eager('[columns.[constrain]]');
  var classModelNames = {
    classes: []
  };
  tables.forEach(function (table) {
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
        if (column.constrain) {
          constrains.push(column.constrain);
        }
        if (column.IS_NULLABLE === 'NO' && !column.COLUMN_DEFAULT && column.COLUMN_NAME !== 'id') {
          requireds.push(column.COLUMN_NAME);
        }
        var type = dataTypes(column.DATA_TYPE);
        if (type === 'string' && searchFilter(column.COLUMN_NAME)) {
          searches.push(column.COLUMN_NAME);
        }
        return {
          name: column.COLUMN_NAME,
          type: type
        };
      }),
      requireds: requireds,
      searches: searches,
      relations: constrains.map(function (column) {
        var targetTableName = singularize(column.REFERENCED_TABLE_NAME);
        targetTableName = camelCase(targetTableName);
        return {
          name: targetTableName,
          column: column.COLUMN_NAME,
          targetModel: capitalize(targetTableName) + 'Model',
          targetTableName: column.REFERENCED_TABLE_NAME,
          targetColumn: column.REFERENCED_COLUMN_NAME
        };
      })
    };
    classModelNames.classes.push(data);
  });
  models += Mustache.render(templateModel, classModelNames);
  fs.writeFileSync(outputModelFile, models);
  return true;
};
//# sourceMappingURL=index.js.map