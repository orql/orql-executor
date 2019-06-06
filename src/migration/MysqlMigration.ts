import Migration, {DatabaseColumn, DatabaseFK} from './Migration';
import Session from '../Session';
import Schema, {Column, DataType} from '../Schema';

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
  async renameTable(session: Session, oldName: string, newName: string) {
    const sql = `alter table ${oldName} rename to ${newName}`;
    await session.nativeUpdate(sql);
  }
  async dropTable(session: Session, name: string) {
    const sql = `drop table ${name}`;
    await session.nativeUpdate(sql);
  }
  async addColumn(session: Session, schema: Schema, column: Column) {
    const sql = `alter table ${schema.table} add ${this.genCreateColumn(column)}`;
    await session.nativeUpdate(sql);
  }
  async updateColumn(session: Session, schema: Schema, column: Column, oldField?: string) {
    const sql = `alter table ${schema.table} change ${oldField || column.field} ${this.genCreateColumn(column)}`;
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
      const exist = await this.existsTable(session, schema.table);
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
      const exist = await this.existsTable(session, schema.table);
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
    for (const schema of schemas) {
      // 修改外键
      await this.updateFks(session, schema);
    }
  }
  async updateFks(session: Session, schema: Schema) {
    const fkColumns = await this.queryAllFK(session, schema);
    const refColumns = schema.columns.filter(column => column.refKey);
    for (const column of refColumns) {
      const fkColumn = fkColumns.find(fkColumn => fkColumn.name == column.field);
      if (fkColumn) {
        const change = this.shouldUpdateFK(column, fkColumn);
        if (change) await this.updateFK(session, schema, column);
        continue;
      }
      // 外键不存在
      await this.addFK(session, schema, column);
    }
  }
  async existsTable(session: Session, name: string): Promise<boolean> {
    const {results, fields} = await session.nativeQuery(`show tables like '${name}'`);
    return results.length > 0 ? results[0][fields[0]] == name : false;
  }
  async queryAllColumn(session: Session, schema: Schema): Promise<DatabaseColumn[]> {
    const sql = `select column_name as name, is_nullable as nullable, column_type as type from information_schema.columns where table_schema = database() && table_name = '${schema.table}'`;
    const {results} = await session.nativeQuery(sql);
    return results.map(result => this.getDatabaseColumn(result));
  }
  async queryColumn(session: Session, schema: Schema, column: Column): Promise<DatabaseColumn | undefined> {
    const sql = `select column_name as name, is_nullable as nullable, column_type as type from information_schema.columns where table_schema = database() && table_name = '${schema.table}' && column_name = '${column.field}'`;
    // 查询字段
    const {results} = await session.nativeQuery(sql);
    if (results.length == 0) return;
    return this.getDatabaseColumn(results[0]);
  }
  getDatabaseColumn(result: any): DatabaseColumn {
    const [type, length] = this.getTypeAndLength(result['type']);
    return {name: result.name, nullable: result.nullable == 'YES', type, length};
  }
  getDatabaseFKColumn(result: any): DatabaseFK {
    return {name: result.name, ref: result.ref, refKey: result.refKey};
  }
  shouldUpdateColumn(column: Column, databaseColumn: DatabaseColumn): boolean {
    let change = false;
    if (this.genColumnType(column, 'query') != databaseColumn.type) change = true;
    if (column.length != undefined && column.length != databaseColumn.length) change = true;
    if (!column.primaryKey) {
      // 要求必须，但是可以为空，需要更改
      if (column.required && databaseColumn.nullable) change = true;
      // 不要求必须，但是不可以为空，需要更改
      if (!column.required && !databaseColumn.nullable) change = true;
    }
    return change;
  }
  shouldUpdateFK(column: Column, fkColumn: DatabaseFK): boolean {
    // 外键已指向另外表
    return column.ref!.table != fkColumn.ref;
  }
  getTypeAndLength(type: string): [string, number?] {
    const arr = /(.+?)\((.+?)\)/.exec(type);
    if (!arr) return [type, undefined];
    return [arr[1], parseInt(arr[2])];
  }
  async addFK(session: Session, schema: Schema, column: Column) {
    const sql = `alter table ${schema.name} add constraint ${this.genFK(schema, column)} foreign key(${column.field}) REFERENCES ${column.ref!.table}(${column.ref!.getIdColumn()!.field})`;
    await session.nativeUpdate(sql);
  }
  async queryFK(session: Session, schema: Schema, column: Column): Promise<DatabaseFK | undefined> {
    const sql = `select column_name as name, referenced_table_name as ref, referenced_column_name as refKey from information_schema.key_column_usage where constraint_schema = database() && table_name = '${schema.table}' && constraint_name <> 'PRIMARY' && column_name = '${column.field}'`;
    const {results} = await session.nativeQuery(sql);
    if (results.length == 0) return;
    return this.getDatabaseFKColumn(results[0]);
  }
  async updateFK(session: Session, schema: Schema, column: Column) {
    await this.dropFK(session, schema, column);
    await this.addFK(session, schema, column);
  }
  async queryAllFK(session: Session, schema: Schema): Promise<DatabaseFK[]> {
    const sql = `select column_name as name, referenced_table_name as ref, referenced_column_name as refKey from information_schema.key_column_usage where constraint_schema = database() && table_name = '${schema.table}' && constraint_name <> 'PRIMARY'`;
    const {results} = await session.nativeQuery(sql);
    return results.map(result => this.getDatabaseFKColumn(result));
  }
  async dropFK(session: Session, schema: Schema, column: Column) {
    await session.nativeUpdate(`alter table ${schema.table} drop foreign key ${this.genFK(schema, column)}`);
  }
}