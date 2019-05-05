import mysql, {FieldInfo} from 'mysql';
import {QueryResult, Connection} from './Database';
import Database from './Database';
import NamedParamSql, {Params} from '../sql/NamedParamSql';
import {ConnectionOptions} from '../Configuration';

class MysqlQueryResult implements QueryResult {
  private result: any[];
  private fields?: FieldInfo[];
  constructor(result: Array<any>, fields?: FieldInfo[]) {
    this.result = result;
    this.fields = fields;
  }
  get(i: number | string): any {
    if (typeof i == 'string') return this.result[i];
    const name = this.fields![i].name;
    return this.result[name];
  }
}

class MysqlConnection implements Connection {
  private origin: mysql.Connection;
  constructor(options: ConnectionOptions) {
    const {host, password, database, username, port} = options;
    const mOptions = {host, user: username, password, database, port};
    this.origin = mysql.createConnection(mOptions);
    this.origin.connect(err => {
      if (err) console.error(err);
    });
  }
  async query(namedParamSql: NamedParamSql): Promise<Array<QueryResult>> {
    return new Promise<Array<QueryResult>>((resolve, reject) => {
      console.log(namedParamSql.toString());
      this.origin.query(namedParamSql.sql, namedParamSql.getParamArray(), (error, results, fields) => {
        if (error) {
          reject(error);
          return;
        }
        const array = results.map(result => new MysqlQueryResult(result, fields));
        resolve(array);
      });
    });
  }
  async add(namedParamSql: NamedParamSql): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      console.log(namedParamSql.toString());
      this.origin.query(namedParamSql.sql, namedParamSql.getParamArray(), (error, results, fields) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(results.insertId);
      });
    });
  }
  async update(namedParamSql: NamedParamSql): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      console.log(namedParamSql.toString());
      this.origin.query(namedParamSql.sql, namedParamSql.getParamArray(), (error, results, fields) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(results.affectedRows);
      });
    });
  }
  async delete(namedParamSql: NamedParamSql): Promise<number> {
    return await this.update(namedParamSql);
  }
  beginTransaction(): Promise<void> {
    return new Promise<void>((resolve) => {
      this.origin.beginTransaction(err => {
        if (err) throw err;
        resolve();
      });
    });
  }
  close(): Promise<void> {
    return new Promise<void>(resolve => {
      this.origin.end(err => {
        if (err) throw err;
        resolve();
      });
    });
  }
  commit(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.origin.commit(err => {
        if (err) {
          this.origin.rollback(err => {
            if (err) throw err;
            resolve();
          });
        }
      });
    });
  }
  rollback(): Promise<void> {
    return new Promise<void>(resolve => {
      this.origin.rollback(err => {
        if (err) throw err;
        resolve();
      });
    });
  }
}

export = class MysqlDriver implements Database {
  async getConnect(options: ConnectionOptions): Promise<Connection> {
    return new MysqlConnection(options);
  }
}