import NamedParamSql from '../sql/NamedParamSql';
import {ConnectionOptions} from '../Configuration';

export interface QueryResult {
  // result.id result.name
  results: any[];
  fields: string[];
}

export interface Connection {
  /**
   * 查询
   * @param namedParamSql
   */
  query(namedParamSql: NamedParamSql): Promise<QueryResult>;

  /**
   * 添加
   * @param namedParamSql
   */
  add(namedParamSql: NamedParamSql): Promise<any>;

  /**
   * 修改
   * @param namedParamSql
   */
  update(namedParamSql: NamedParamSql): Promise<number>;

  /**
   * 删除
   * @param namedParamSql
   */
  delete(namedParamSql: NamedParamSql): Promise<number>;

  /**
   * 开始事务
   */
  beginTransaction(): Promise<void>;

  /**
   * 关闭
   */
  close(): Promise<void>;

  /**
   * 提交事务
   */
  commit(): Promise<void>;

  /**
   * 回滚
   */
  rollback(): Promise<void>;
}

export default interface Database {
  getConnect(options: ConnectionOptions): Promise<Connection>;
}