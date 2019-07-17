'use strict';Object.defineProperty(exports,'__esModule',{value:!0});var _extends=Object.assign||function(a){for(var b,c=1;c<arguments.length;c++)for(var d in b=arguments[c],b)Object.prototype.hasOwnProperty.call(b,d)&&(a[d]=b[d]);return a},_createClass=function(){function a(a,b){for(var c,d=0;d<b.length;d++)c=b[d],c.enumerable=c.enumerable||!1,c.configurable=!0,'value'in c&&(c.writable=!0),Object.defineProperty(a,c.key,c)}return function(b,c,d){return c&&a(b.prototype,c),d&&a(b,d),b}}(),_fsExtra=require('fs-extra'),_fsExtra2=_interopRequireDefault(_fsExtra),_path=require('path'),_path2=_interopRequireDefault(_path),_pluralize=require('pluralize'),_pluralize2=_interopRequireDefault(_pluralize),_mustache=require('mustache'),_mustache2=_interopRequireDefault(_mustache),_knex=require('knex'),_knex2=_interopRequireDefault(_knex),_objection=require('objection'),_package=require('../package.json'),_models=require('./models'),_zlib=require('zlib');function _interopRequireDefault(a){return a&&a.__esModule?a:{default:a}}function _toConsumableArray(a){if(Array.isArray(a)){for(var b=0,c=Array(a.length);b<a.length;b++)c[b]=a[b];return c}return Array.from(a)}function _classCallCheck(a,b){if(!(a instanceof b))throw new TypeError('Cannot call a class as a function')}var dataTypes=function(a){/* 
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
   */return'varchar'===a||'longtext'===a||'tinytext'===a||'text'===a||'mediumtext'===a||'char'===a?'string':'date'===a?'date':'datetime'===a?'date-time':'bigint'===a||'int'===a||'tinyint'===a||'smallint'===a||'timestamp'===a?'integer':'decimal'===a||'double'===a||'float'===a?'number':'any'},searchFilter=function(a){return'old_password'!==a&&'password'!==a&&'token'!==a},singularize=function(a){var b=a.toLowerCase().split(/[_\- ]/);return b.map(function(a){return _pluralize2.default.singular(a)}).join('-')},capitalize=function(a){return a.charAt(0).toUpperCase()+a.slice(1)},camelCase=function(a){return a.toLowerCase().replace(/[-_]([a-z0-9])/g,function(a){return a[1].toUpperCase()})},ObjectionModelGenerator=function(){/**
   * 
   * @param {*} credentials 
   * @param {*} credentials.user
   * @param {*} credentials.password
   * @param {*} credentials.host
   * @param {*} credentials.port
   * @param {*} dbName 
   * @param {*} dbKnexObjectPath 
   * @param {*} outputFilePath 
   */function a(){var b=0<arguments.length&&void 0!==arguments[0]?arguments[0]:{},c=arguments[1],d=arguments[2];_classCallCheck(this,a),this.dbName=c,this.dbFile=d;// Initialize knex.
var e=(0,_knex2.default)({client:'mysql',connection:_extends({},b,{database:'information_schema'})});e.on('query',function(a){console.log('======== on query ==========');var b=0,c=a.sql.replace(/\?/g,function(){return'"'+a.bindings[b++]+'"'});console.log(c)}),_objection.Model.knex(e)}return _createClass(a,[{key:'createModels',value:async function n(a){var b=this.dbName,c=this.dbFile,d=_path2.default.join(__dirname,'../templates/'),e=_path2.default.join(d,'modelHeaderTemplate.mustache'),f=_path2.default.join(d,'modelTemplate.mustache'),g=await _fsExtra2.default.readFile(e,'UTF-8'),h=await _fsExtra2.default.readFile(f,'UTF-8'),i=_mustache2.default.render(g,{dbFile:c});_models.TableModel.dbName=b;var j=await _models.KeyColumnUsage.query().whereNotNull('REFERENCED_COLUMN_NAME').andWhere('table_schema','=',b),k=_models.TableModel.query().where('table_schema','=',b);a&&(k=k.andWhere('table_name','like',a+'%'));var l=await k.eager('[columns]'),m={classes:[],dbFile:c};return l.forEach(async function(a){var b=singularize(a.TABLE_NAME);b=camelCase(b),b=capitalize(b);var c=[],d=[],e=[],f={modelName:b+'Model',tableName:a.TABLE_NAME,properties:a.columns.map(function(b){c.push.apply(c,_toConsumableArray(j.filter(function(c){return a.TABLE_NAME===c.TABLE_NAME&&b.COLUMN_NAME===c.COLUMN_NAME}))),'NO'!==b.IS_NULLABLE||b.COLUMN_DEFAULT||'id'===b.COLUMN_NAME||d.push(b.COLUMN_NAME);var f=dataTypes(b.DATA_TYPE);return'string'===f&&searchFilter(b.COLUMN_NAME)&&e.push(b.COLUMN_NAME),{name:b.COLUMN_NAME,type:f}}),requireds:d,searches:e,relations:c.map(function(a){var b=singularize(a.REFERENCED_TABLE_NAME);return b=camelCase(b),{name:b,column:a.COLUMN_NAME,targetModel:capitalize(b)+'Model',targetTableName:a.REFERENCED_TABLE_NAME,targetColumn:a.REFERENCED_COLUMN_NAME}})};m.classes.push(f)}),i+=_mustache2.default.render(h,m),i}},{key:'version',get:function a(){return _package.version}}]),a}();exports.default=ObjectionModelGenerator,module.exports=exports.default,module.exports.default=exports.default;
//# sourceMappingURL=ObjectionModelGenerator.js.map