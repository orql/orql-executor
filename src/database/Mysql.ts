import mysql from 'mysql';
import {Connection, QueryResult} from './Database';
import Database from './Database';
import NamedParamSql, {Params} from '../sql/NamedParamSql';
import {ConnectionOptions} from '../Configuration';

class MysqlConnection implements Connection {
  private options: ConnectionOptions;
  private origin: mysql.Connection;
  constructor(options: ConnectionOptions) {
    this.options = options;
    const {host, password, database, username, port} = this.options;
    const mOptions = {host, user: username, password, database, port};
    this.origin = mysql.createConnection(mOptions);
  }
  async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.origin.connect(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
  async query(namedParamSql: NamedParamSql): Promise<QueryResult> {
    return new Promise<QueryResult>((resolve, reject) => {
      console.log(namedParamSql.toString());
      this.origin.query(namedParamSql.sql, namedParamSql.getParamArray(), (error, results, fields) => {
        if (error) return reject(error);
        const _fields = fields != undefined ? fields.map(info => info.name) : [];
        const _results = results.map(result => {
          const obj = {};
          for (const field of _fields) {
            obj[field] = result[field];
          }
          return obj;
        });
        resolve({
          results: _results,
          fields: _fields
        });
      });
    });
  }
  async add(namedParamSql: NamedParamSql): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      console.log(namedParamSql.toString());
      this.origin.query(namedParamSql.sql, namedParamSql.getParamArray(), (error, results, fields) => {
        if (error) return reject(error);
        resolve(results.insertId);
      });
    });
  }
  async update(namedParamSql: NamedParamSql): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      console.log(namedParamSql.toString());
      this.origin.query(namedParamSql.sql, namedParamSql.getParamArray(), (error, results, fields) => {
        if (error) return reject(error);
        resolve(results.affectedRows);
      });
    });
  }
  async delete(namedParamSql: NamedParamSql): Promise<number> {
    return await this.update(namedParamSql);
  }
  beginTransaction(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.origin.beginTransaction(err => {
        if (err) return reject(err);
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
        if (!err) return resolve();
        this.origin.rollback(err => {
          if (err) return reject(err);
          resolve();
        });
      });
    });
  }
  rollback(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.origin.rollback(err => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
}

export = class MysqlDriver implements Database {
  async getConnect(options: ConnectionOptions): Promise<Connection> {
    const connect = new MysqlConnection(options);
    await connect.connect();
    return connect;
  }
}