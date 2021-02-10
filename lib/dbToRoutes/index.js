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

module.exports = async function (dbName, dbConnection, fileNameRoutes) {
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

  var templateRoutes = fs.readFileSync(path.join(__dirname, 'templates/routesTemplate.mustache'), 'UTF-8');
  var tables = await TableModel.query().where('table_schema', '=', DB).eager('[columns.[constrain]]');
  var routes = [];
  tables.forEach(function (table) {
    var name = singularize(table.TABLE_NAME);
    var routesPerController = [{
      route: 'GET /' + name,
      controller: capitalize(camelCase(name)) + 'Controller.get'
    }, {
      route: 'GET /' + name + '/:ID',
      controller: capitalize(camelCase(name)) + 'Controller.getByID'
    }, {
      route: 'POST /' + name,
      controller: capitalize(camelCase(name)) + 'Controller.set'
    }, {
      route: 'PATCH /' + name + '/:ID',
      controller: capitalize(camelCase(name)) + 'Controller.update'
    }, {
      route: 'DELETE /' + name + '/:ID',
      controller: capitalize(camelCase(name)) + 'Controller.delete'
    }];
    routes.push.apply(routes, routesPerController);
  });
  routes.sort(function (a, b) {
    return a.route < b.route ? -1 : a.route > b.route ? 1 : 0;
  });
  var rendered = Mustache.render(templateRoutes, {
    routes: routes
  });
  fs.writeFileSync(fileNameRoutes, rendered);
};
//# sourceMappingURL=index.js.map