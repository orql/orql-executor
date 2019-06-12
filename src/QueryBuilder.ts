import Session from './Session';
import {Params} from './sql/NamedParamSql';

export default class QueryBuilder {
  private session: Session;
  private _page?: number;
  private _size?: number;
  private _offset?: number;
  private _limit?: number;
  private _orql?: string;
  private _params: Params = {};
  constructor(session: Session) {
    this.session = session;
  }
  page(page: number, size?: number): QueryBuilder {
    this._page = page;
    if (size != undefined) this._size = size;
    return this;
  }
  size(size: number): QueryBuilder {
    this._size = size;
    return this;
  }
  offset(offset: number): QueryBuilder {
    this._offset = offset;
    return this;
  }
  limit(limit: number): QueryBuilder {
    this._limit = limit;
    return this;
  }
  orql(orql: string): QueryBuilder {
    this._orql = orql;
    return this;
  }
  param(key: string, value: any): QueryBuilder {
    this._params[key] = value;
    return this;
  }
  async queryOne(): Promise<any | undefined> {
    return await this.session.query(this._orql!, this._params);
  }
  async queryAll(): Promise<any[]> {
    if (this._page != undefined && this._size != undefined) {
      this._offset = (this._page - 1) * this._size;
      this._limit = this._size;
    }
    return await this.session.query(this._orql!, this._params, {offset: this._offset, limit: this._limit});
  }
  async count(): Promise<number> {
    return await this.session.query(this._orql!, this._params);
  }
}