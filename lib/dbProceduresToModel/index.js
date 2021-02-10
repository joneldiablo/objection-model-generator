'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

require('dotenv').config();

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

  var RoutinesModel = function (_Model) {
    _inherits(RoutinesModel, _Model);

    function RoutinesModel() {
      _classCallCheck(this, RoutinesModel);

      return _possibleConstructorReturn(this, (RoutinesModel.__proto__ || Object.getPrototypeOf(RoutinesModel)).apply(this, arguments));
    }

    _createClass(RoutinesModel, null, [{
      key: 'tableName',
      get: function get() {
        return 'routines';
      }
    }]);

    return RoutinesModel;
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

  var routines = await RoutinesModel.query().where('routine_schema', '=', DB).andWhere('routine_type', '=', 'PROCEDURE');
  var classModelNames = {
    classes: []
  };
  routines.forEach(function (routine) {
    var modelName = singularize(routine.ROUTINE_NAME);
    modelName = camelCase(modelName);
    modelName = capitalize(modelName);
    var requireds = [];
    var searches = [];
    var data = {
      modelName: modelName + 'Model',
      tableName: routine.ROUTINE_NAME,
      requireds: requireds,
      searches: searches
    };
    classModelNames.classes.push(data);
  });
  models += Mustache.render(templateModel, classModelNames);
  fs.writeFileSync(outputModelFile, models);
};
//# sourceMappingURL=index.js.map