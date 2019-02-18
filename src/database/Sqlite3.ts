import * as sqlite3 from 'sqlite3';
import Database, {Connection, QueryResult} from './Database';
import {ConnectionOptions} from '../Configuration';
import NamedParamSql from '../sql/NamedParamSql';

sqlite3.verbose();

class Sqlite3QueryResult implements QueryResult {
  private row: any;
  constructor(row: any) {
    this.row = row;
  }
  get(i: number | string): object {
    if (typeof i == 'string') return this.row[i];
    const name = Object.keys(this.row)[i];
    return this.row[name];
  }
}

class Sqlite3Connection implements Connection {
  private db: sqlite3.Database;
  constructor(options: ConnectionOptions) {
    const {path} = options;
    this.db = new sqlite3.Database(path!);
  }
  add(namedParamSql: NamedParamSql): Promise<any> {
    return new Promise<number>((resolve, reject) => {
      console.log(namedParamSql.toString());
      this.db.run(namedParamSql.sql, namedParamSql.getParamArray(), function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.lastID);
      });
    });
  }

  async beginTransaction(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.run('begin transaction', function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.close(err => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async commit(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.run('commit transaction', function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async delete(namedParamSql: NamedParamSql): Promise<number> {
    return await this.update(namedParamSql);
  }

  async query(namedParamSql: NamedParamSql): Promise<Array<QueryResult>> {
    console.log(namedParamSql.toString());
    return new Promise<Array<QueryResult>>((resolve, reject) => {
      this.db.all(namedParamSql.sql, namedParamSql.getParamArray(), ((err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        const results = rows.map(row => new Sqlite3QueryResult(row));
        resolve(results);
      }));
    });
  }

  async rollback(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db.run('rollback transaction', function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  update(namedParamSql: NamedParamSql): Promise<number> {
    console.log(namedParamSql.toString());
    return new Promise<number>((resolve, reject) => {
      this.db.run(namedParamSql.sql, namedParamSql.getParamArray(), function (err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
  }

}

export = class Sqlite3 implements Database {
  async getConnect(options: ConnectionOptions): Promise<Connection> {
    return new Sqlite3Connection(options);
  }
}