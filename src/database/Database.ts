import NamedParamSql from '../sql/NamedParamSql';
import {ConnectionOptions} from '../Configuration';

export interface QueryResult {
  // result.id result.name
  results: any[];
  fields: string[];
}

export interface Connection {
  query(namedParamSql: NamedParamSql): Promise<QueryResult>;
  add(namedParamSql: NamedParamSql): Promise<any>;
  update(namedParamSql: NamedParamSql): Promise<number>;
  delete(namedParamSql: NamedParamSql): Promise<number>;
  beginTransaction(): Promise<void>;
  close(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export default interface Database {
  getConnect(options: ConnectionOptions): Promise<Connection>;
}