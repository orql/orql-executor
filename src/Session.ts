import Configuration, {SchemaManager} from './Configuration';
import {Connection, QueryResult} from './database/Database';
import Parser from 'orql-parser';
import OrqlToSql from './sql/OrqlToSql';
import NamedParamSql, {Params} from './sql/NamedParamSql';
import QueryBuilder from './QueryBuilder';
import UpdateBuilder from './UpdateBuilder';
import Schema from './Schema';
import ResultMapper, {MapperResult, ResultRoot} from './mapper/ResultMapper';
import OrqlResultMapper from './mapper/OrqlResultMapper';

export default class Session {
  readonly configuration: Configuration;
  readonly schemaManager: SchemaManager;
  private orqlToSql: OrqlToSql;
  private connection: Connection;
  private resultMapper: ResultMapper;
  private orqlResultMapper: OrqlResultMapper;
  // private parser: Parser;
  constructor(configuration: Configuration, connection: Connection) {
    this.connection = connection;
    this.configuration = configuration;
    this.schemaManager = configuration.schemaManager;
    this.orqlToSql = configuration.orqlToSql;
    this.resultMapper = configuration.resultMapper;
    this.orqlResultMapper = configuration.orqlResultMapper;
  }
  private parse(orql: string) {
    return Parser.parse(orql);
  }
  async beginTransaction() {
    await this.connection.beginTransaction();
  }
  async commit() {
    await this.connection.commit();
  }
  async rollback() {
    await this.connection.rollback();
  }
  async close() {
    await this.connection.close();
  }
  getSchema(name: string): Schema | undefined {
    return this.schemaManager.getSchema(name);
  }
  async query(orql: string, params: Params, options: {offset?: number, limit?: number} = {}): Promise<any> {
    const node = this.parse(orql);
    const sql = this.orqlToSql.toQuery(node, {offset: options.offset, limit: options.limit});
    const results = await this.connection.query(new NamedParamSql(sql, params));
    // count
    if (node.op == 'count') return results[0].get(0);
    const mapper = this.orqlResultMapper.toResult(node.item);
    const mapperResult = this.resultMapper.mappe(mapper, results);
    if (!node.item.isArray) {
      // object
      return mapperResult.length > 0 ? mapperResult[0] : undefined;
    }
    // array
    return mapperResult;
  }
  async add(orql: string, params: Params = {}): Promise<any> {
    const node = this.parse(orql);
    const sql = this.orqlToSql.toAdd(node, params);
    // 代理params 判断defaultValue和initialValue
    return this.connection.add(new NamedParamSql(sql, params));
  }
  async update(orql: string, params: Params = {}): Promise<number> {
    const node = this.parse(orql);
    const sql = this.orqlToSql.toUpdate(node);
    return this.connection.update(new NamedParamSql(sql, params));
  }
  async delete(orql: string, params: Params = {}): Promise<number> {
    const node = this.parse(orql);
    const sql = this.orqlToSql.toDelete(node);
    return this.connection.delete(new NamedParamSql(sql, params));
  }
  async nativeQuery(sql: string, params: Params = {}, mapper?: ResultRoot): Promise<QueryResult[] | MapperResult[]> {
    const results = await this.connection.query(new NamedParamSql(sql, params));
    return mapper ? this.resultMapper.mappe(mapper, results) : results;
  }
  async nativeUpdate(sql: string, params?: Params): Promise<number> {
    params = params || {};
    return this.connection.update(new NamedParamSql(sql, params));
  }
  buildQuery(): QueryBuilder {
    return new QueryBuilder(this);
  }
  buildUpdate(): UpdateBuilder {
    return new UpdateBuilder(this);
  }
}