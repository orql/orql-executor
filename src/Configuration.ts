import {SchemaOptions} from './Schema';
import Database from './database/Database';
import OrqlToSql from './sql/OrqlToSql';
import SchemaManager from './SchemaManager';
import BaseDialect from './dialect/BaseDialect';
import Migration from './migration/Migration';
import OrqlResultMapper from './mapper/OrqlResultMapper';
import ResultMapper from './mapper/ResultMapper';

export interface ConfigurationOptions {
  schemas?: SchemaOptions[];
  dialect?: 'mysql' | 'sqlite3';
  connection?: ConnectionOptions;
}

export interface ConnectionOptions {
  host?: string;
  database?: string;
  username?: string;
  password?: string;
  path?: string;
}

class Configuration {
  readonly schemaManager: SchemaManager;
  readonly database?: Database;
  readonly dialect?: BaseDialect;
  readonly orqlToSql: OrqlToSql;
  readonly migration?: Migration;
  readonly resultMapper: ResultMapper;
  readonly orqlResultMapper: OrqlResultMapper;
  readonly connectionOptions?: ConnectionOptions;
  constructor(options: ConfigurationOptions) {
    switch (options.dialect) {
      case 'mysql':
        const MysqlDriver = require('./database/Mysql');
        const MysqlDialect = require('./dialect/MysqlDialect');
        const MsqlMigration = require('./migration/MysqlMigration');
        this.database = new MysqlDriver(this.connectionOptions);
        this.dialect = new MysqlDialect();
        this.migration = new MsqlMigration();
        break;
      case 'sqlite3':
        const SqliteDriver = require('./database/Sqlite3');
        const SqliteDialect = require('./dialect/SqliteDialect3');
        const SqliteMigration = require('./migration/Sqlite3Migration');
        this.database = new SqliteDriver(this.connectionOptions);
        this.dialect = new SqliteDialect();
        this.migration = new SqliteMigration();
        break;
    }
    this.schemaManager = new SchemaManager();
    this.orqlToSql = new OrqlToSql(this.schemaManager, this.dialect!);
    this.resultMapper = new ResultMapper();
    this.orqlResultMapper = new OrqlResultMapper(this.schemaManager);
    this.connectionOptions = options.connection;
  }
}

export {SchemaManager};
export default Configuration;