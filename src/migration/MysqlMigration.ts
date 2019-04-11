import Migration from './Migration';
import Session from '../Session';
import Schema, {Column, DataType} from '../Schema';
import {QueryResult} from '../database/Database';

export = class MysqlMigration implements Migration {
  async create(session: Session): Promise<void> {
    const schemas = session.schemaManager.schemas;
    const database = session.configuration.connectionOptions!.database!;
    for (const [name, schema] of schemas.entries()) {
      await this.createTable(session, schema);
    }
    for (const [name, schema] of schemas.entries()) {
      await this.updateFks(session, schema, database);
    }
  }
  private async createTable(session: Session, schema: Schema) {
    if (schema.columns.length == 0) return;
    const sql = `create table if not exists ${schema.table} (${schema.columns.map(column => this.genCreateColumn(column)).join(', ')})`;
    await session.nativeUpdate(sql);
  }
  private async createFK(session: Session, schema: Schema, column: Column) {
    const sql = `alter table ${schema.name} add constraint ${this.genFK(schema, column)} foreign key(${column.field}) REFERENCES ${column.ref!.table}(${column.ref!.getIdColumn()!.field})`;
    await session.nativeUpdate(sql);
  }
  private genFK(schema: Schema, column: Column) {
    return `fk_${schema.table}_${column.field}`;
  }
  genCreateColumn(column: Column): string {
    let sql = `${column.field} ${this.genColumnTypeAndLength(column)}`;
    if (column.primaryKey) sql += ' primary key';
    if (column.generatedKey) sql += ' auto_increment';
    if (!column.primaryKey && column.required) sql += ' not null';
    return sql;
  }
  genColumnType(column: Column): string {
    let type = column.type.toString();
    switch (type) {
      case DataType.String:
        type = 'varchar';
        break;
      case DataType.Long:
        type = 'bigint'
        break;
    }
    return type;
  }
  genColumnTypeAndLength(column: Column): string {
    const type = this.genColumnType(column);
    return column.length != undefined && column.length > 0 ? `${type}(${column.length})` : `${type}`;
  }
  async drop(session: Session): Promise<void> {
    const schemas = session.schemaManager.schemas;
    await session.nativeUpdate('set foreign_key_checks = 0');
    for (const [name, schema] of schemas.entries()) {
      const exist = await this.existTable(session, schema);
      if (exist) {
        const sql = `drop table ${schema.table}`;
        await session.nativeUpdate(sql);
      }
    }
    await session.nativeUpdate('set foreign_key_checks = 1');
  }
  async update(session: Session): Promise<void> {
    const database = session.configuration.connectionOptions!.database!;
    const schemas = session.schemaManager.schemas;
    for (const [name, schema] of schemas.entries()) {
      const exist = await this.existTable(session, schema);
      if (!exist) {
        await this.createTable(session, schema);
        continue;
      }
      const sql = `select COLUMN_NAME as name, IS_NULLABLE as nullable, COLUMN_TYPE as type from information_schema.columns where table_schema = '${database}' && table_name = '${schema.table}'`;
      // 查询字段
      const fields = await session.nativeQuery(sql) as QueryResult[];
      const fieldNames = fields.map(field => field.get('name'));
      for (const column of schema.columns) {
        const index = fieldNames.indexOf(column.field);
        if (index >= 0) {
          let change = false;
          const field = fields[index];
          const [type, length] = this.getTypeAndLength(field.get('type'));
          if (this.genColumnType(column) != type) change = true;
          if (column.length && column.length != length) change = true;
          if (!column.primaryKey) {
            // 不可空
            if (column.required && field.get('nullable') != 'NO') change = true;
            // 可空
            if (!column.required && field.get('nullable') != 'YES') change = true;
          }
          if (change) {
            // 修改字段
            const sql = `alter table ${schema.table} change ${column.field} ${this.genCreateColumn(column)}`;
            await session.nativeUpdate(sql);
          }
        } else {
          // 字段不存在
          const sql = `alter table ${schema.table} add ${this.genCreateColumn(column)}`;
          await session.nativeUpdate(sql);
        }
      }
    }
    for (const [name, schema] of schemas) {
      // 修改外键
      await this.updateFks(session, schema, database);
    }
  }
  async updateFks(session: Session, schema: Schema, database: string) {
    const fks = await session.nativeQuery(`select COLUMN_NAME as name, REFERENCED_TABLE_NAME as ref, REFERENCED_COLUMN_NAME as refKey from INFORMATION_SCHEMA.KEY_COLUMN_USAGE where CONSTRAINT_SCHEMA = '${database}' && TABLE_NAME = '${schema.table}' && CONSTRAINT_NAME <> 'PRIMARY'`) as QueryResult[];
    const fkNames = fks.map(fk => fk.get('name'));
    const refColumns = schema.columns.filter(column => column.refKey);
    for (const column of refColumns) {
      const index = fkNames.indexOf(column.field);
      if (index >= 0) {
        // 外键存在
        const fk = fks[index];
        if (column.ref!.table != fk.get('ref')) {
          // 外键已指向另外表
          await session.nativeUpdate(`alter table ${schema.table} drop foreign key ${this.genFK(schema, column)}`);
          await this.createFK(session, schema, column);
        }
      } else {
        // 外键不存在
        await this.createFK(session, schema, column);
      }
    }
  }
  async existTable(session: Session, schema: Schema): Promise<boolean> {
    const result = await session.nativeQuery(`show tables like '${schema.table}'`);
    return result.length > 0 ? result[0].get(0) == schema.table : false;
  }
  getTypeAndLength(type: string): [string, number] {
    const arr = /(.+?)\((.+?)\)/.exec(type)!;
    return [arr[1], parseInt(arr[2])];
  }
}