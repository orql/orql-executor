import Migration, {DatabaseColumn} from './Migration';
import Session from '../Session';
import Schema, {Column, DataType} from '../Schema';
import {QueryResult} from '../database/Database';

interface DatabaseFKColumn {
  name: string;
  ref: string;
  refKey: string;
}

export = class MysqlMigration implements Migration {
  async create(session: Session): Promise<void> {
    const schemas = session.schemaManager.schemas;
    for (const [name, schema] of schemas.entries()) {
      await this.createTable(session, schema);
    }
    for (const [name, schema] of schemas.entries()) {
      await this.updateFks(session, schema);
    }
  }
  async createTable(session: Session, schema: Schema) {
    if (schema.columns.length == 0) return;
    const sql = `create table if not exists ${schema.table} (${schema.columns.map(column => this.genCreateColumn(column)).join(', ')})`;
    await session.nativeUpdate(sql);
  }
  async addColumn(session: Session, schema: Schema, column: Column) {
    const sql = `alter table ${schema.table} add ${this.genCreateColumn(column)}`;
    await session.nativeUpdate(sql);
  }
  async updateColumn(session: Session, schema: Schema, column: Column) {
    const sql = `alter table ${schema.table} change ${column.field} ${this.genCreateColumn(column)}`;
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
  genColumnType(column: Column, type: 'create' | 'query'): string {
    let columnType = column.type.toString();
    switch (columnType) {
      case DataType.String:
        columnType = 'varchar';
        break;
      case DataType.Long:
        columnType = 'bigint'
        break;
      case DataType.Boolean:
        if (type == 'query') columnType = 'tinyint';
        break;
    }
    return columnType;
  }
  genColumnTypeAndLength(column: Column): string {
    const type = this.genColumnType(column, 'create');
    return column.length != undefined && column.length > 0 ? `${type}(${column.length})` : `${type}`;
  }
  async drop(session: Session): Promise<void> {
    const schemas = session.schemaManager.schemas;
    await session.nativeUpdate('set foreign_key_checks = 0');
    for (const [name, schema] of schemas.entries()) {
      const exist = await this.existsTable(session, schema);
      if (exist) {
        const sql = `drop table ${schema.table}`;
        await session.nativeUpdate(sql);
      }
    }
    await session.nativeUpdate('set foreign_key_checks = 1');
  }
  async update(session: Session): Promise<void> {
    const schemas = session.schemaManager.schemas;
    for (const [name, schema] of schemas.entries()) {
      const exist = await this.existsTable(session, schema);
      if (!exist) {
        await this.createTable(session, schema);
        continue;
      }
      const databaseColumns = await this.queryAllColumn(session, schema);
      for (const column of schema.columns) {
        const databaseColumn = databaseColumns.find(databaseColumn => databaseColumn.name == column.field);
        if (databaseColumn) {
          const change = this.shouldUpdateColumn(column, databaseColumn);
          // 修改字段
          change && await this.updateColumn(session, schema, column);
          continue;
        }
        // 字段不存在
        await this.addColumn(session, schema, column);
      }
    }
    for (const [name, schema] of schemas) {
      // 修改外键
      await this.updateFks(session, schema);
    }
  }
  async updateFks(session: Session, schema: Schema) {
    const fkColumns = await this.queryAllFKColumn(session, schema);
    const refColumns = schema.columns.filter(column => column.refKey);
    for (const column of refColumns) {
      const fkColumn = fkColumns.find(fkColumn => fkColumn.name == column.field);
      if (fkColumn) {
        const change = this.shouldUpdateFKColumn(column, fkColumn);
        if (change) await this.updateFKColumn(session, schema, column);
        continue;
      }
      // 外键不存在
      await this.addFKColumn(session, schema, column);
    }
  }
  async existsTable(session: Session, schema: Schema): Promise<boolean> {
    const result = await session.nativeQuery(`show tables like '${schema.table}'`);
    return result.length > 0 ? result[0].get(0) == schema.table : false;
  }
  async queryAllColumn(session: Session, schema: Schema): Promise<DatabaseColumn[]> {
    const sql = `select column_name as name, is_nullable as nullable, column_type as type from information_schema.columns where table_schema = database() && table_name = '${schema.table}'`;
    const results = await session.nativeQuery(sql) as QueryResult[];
    return results.map(result => this.getDatabaseColumn(result));
  }
  async queryColumn(session: Session, schema: Schema, column: Column): Promise<DatabaseColumn | undefined> {
    const sql = `select column_name as name, is_nullable as nullable, column_type as type from information_schema.columns where table_schema = database() && table_name = '${schema.table}' && column_name = '${column.field}'`;
    // 查询字段
    const results = await session.nativeQuery(sql) as QueryResult[];
    if (results.length == 0) return;
    return this.getDatabaseColumn(results[0]);
  }
  getDatabaseColumn(result: QueryResult): DatabaseColumn {
    const [type, length] = this.getTypeAndLength(result.get('type'));
    return {name: result.get('name'), nullable: result.get('nullable') == 'YES', type, length};
  }
  getDatabaseFKColumn(result: QueryResult): DatabaseFKColumn {
    return {name: result.get('ref'), ref: result.get('ref'), refKey: result.get('refKey')};
  }
  shouldUpdateColumn(column: Column, databaseColumn: DatabaseColumn): boolean {
    let change = false;
    if (this.genColumnType(column, 'query') != databaseColumn.type) change = true;
    if (column.length && column.length != databaseColumn.length) change = true;
    if (!column.primaryKey) {
      // 不可空
      if (column.required && !databaseColumn.nullable) change = true;
      // 可空
      if (!column.required && databaseColumn.nullable) change = true;
    }
    return change;
  }
  shouldUpdateFKColumn(column: Column, fkColumn: DatabaseFKColumn): boolean {
    // 外键已指向另外表
    return column.ref!.table != fkColumn.ref;
  }
  getTypeAndLength(type: string): [string, number?] {
    const arr = /(.+?)\((.+?)\)/.exec(type);
    if (!arr) return [type, undefined];
    return [arr[1], parseInt(arr[2])];
  }
  async addFKColumn(session: Session, schema: Schema, column: Column) {
    const sql = `alter table ${schema.name} add constraint ${this.genFK(schema, column)} foreign key(${column.field}) REFERENCES ${column.ref!.table}(${column.ref!.getIdColumn()!.field})`;
    await session.nativeUpdate(sql);
  }
  async queryFKColumn(session: Session, schema: Schema, column: Column): Promise<DatabaseFKColumn | undefined> {
    const sql = `select column_name as name, referenced_table_name as ref, referenced_column_name as refKey from information_schema.key_column_usage where constraint_schema = database() && table_name = '${schema.table}' && constraint_name <> 'PRIMARY' && column_name = '${column.field}'`;
    const results = await session.nativeQuery(sql) as QueryResult[];
    if (results.length == 0) return;
    return this.getDatabaseFKColumn(results[0]);
  }
  async updateFKColumn(session: Session, schema: Schema, column: Column) {
    await session.nativeUpdate(`alter table ${schema.table} drop foreign key ${this.genFK(schema, column)}`);
    await this.addFKColumn(session, schema, column);
  }
  async queryAllFKColumn(session: Session, schema: Schema): Promise<DatabaseFKColumn[]> {
    const sql = `select column_name as name, referenced_table_name as ref, referenced_column_name as refKey from information_schema.key_column_usage where constraint_schema = database() && table_name = '${schema.table}' && constraint_name <> 'PRIMARY'`;
    const results = await session.nativeQuery(sql) as QueryResult[];
    return results.map(result => this.getDatabaseFKColumn(result));
  }
}