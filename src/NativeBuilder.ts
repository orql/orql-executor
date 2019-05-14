import Session from './Session';
import {Params} from './sql/NamedParamSql';
import {ResultRoot} from './mapper/ResultMapper';

export default class NativeBuilder {
  private session: Session;
  private _params: Params = {};
  private _sql?: string;
  private _mapper?: ResultRoot;
  constructor(session: Session) {
    this.session = session;
  }
  sql(sql: string) {
    this._sql = sql;
    return this;
  }
  param(key: string, value: any) {
    this._params[key] = value;
    return this;
  }
  params(params: Params) {
    this._params = params;
    return this;
  }
  mapper(mapper: ResultRoot) {
    this._mapper = mapper;
    return this;
  }
  async queryAll(): Promise<any[]> {
    const {results} = await this.session.nativeQuery(this._sql!, this._params);
    if (this._mapper) {
      return this.session.resultMapper.mappe(this._mapper, results)
    }
    return results;
  }
  async queryOne(): Promise<any | undefined> {
    const results = await this.queryAll();
    if (results.length > 0) return results[0];
  }
  update() {
    return this.session.nativeUpdate(this._sql!, this._params);
  }
}