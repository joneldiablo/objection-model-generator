import {
  Model
} from 'objection';

let dbName;

export class KeyColumnUsage extends Model {
  static get tableName() {
    return 'KEY_COLUMN_USAGE';
  }
}

export class ColumnModel extends Model {
  static get tableName() {
    return 'COLUMNS';
  }
  static get relationMappings() {
    return {
      constrain: {
        relation: Model.BelongsToOneRelation,
        modelClass: KeyColumnUsage,
        filter: query => query.where('TABLE_SCHEMA', dbName).whereNotNull('REFERENCED_COLUMN_NAME'),
        join: {
          from: ['COLUMNS.COLUMN_NAME', 'COLUMNS.TABLE_NAME'],
          to: ['KEY_COLUMN_USAGE.COLUMN_NAME', 'KEY_COLUMN_USAGE.TABLE_NAME']
        }
      }
    };
  }
}

export class TableModel extends Model {
  static get tableName() {
    return 'TABLES';
  }
  static get relationMappings() {
    return {
      columns: {
        relation: Model.HasManyRelation,
        modelClass: ColumnModel,
        filter: query => query.where('TABLE_SCHEMA', dbName),
        join: {
          from: 'TABLES.TABLE_NAME',
          to: 'COLUMNS.TABLE_NAME'
        }
      }
    };
  }
  static set dbName(name) {
    dbName = name;
  }
}