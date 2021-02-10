'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TableModel = exports.ColumnModel = exports.KeyColumnUsage = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _objection = require('objection');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var dbName = void 0;

var KeyColumnUsage = exports.KeyColumnUsage = function (_Model) {
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
}(_objection.Model);

var ColumnModel = exports.ColumnModel = function (_Model2) {
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
          relation: _objection.Model.BelongsToOneRelation,
          modelClass: KeyColumnUsage,
          filter: function filter(query) {
            return query.where('TABLE_SCHEMA', dbName).whereNotNull('REFERENCED_COLUMN_NAME');
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
}(_objection.Model);

var TableModel = exports.TableModel = function (_Model3) {
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
          relation: _objection.Model.HasManyRelation,
          modelClass: ColumnModel,
          filter: function filter(query) {
            return query.where('TABLE_SCHEMA', dbName);
          },
          join: {
            from: 'TABLES.TABLE_NAME',
            to: 'COLUMNS.TABLE_NAME'
          }
        }
      };
    }
  }, {
    key: 'dbName',
    set: function set(name) {
      dbName = name;
    }
  }]);

  return TableModel;
}(_objection.Model);
//# sourceMappingURL=index.js.map