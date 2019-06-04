import {DataType} from '../Schema';
import {EOL} from 'os'
import {get} from '../utils';

enum MatchStatus {
  State,
  Param
}

export type Params = {[name: string]: any}

/**
 * select * from user where id = $id
 */
export default class NamedParamSql {

  private params: Params;

  readonly sql: string;

  // generated id value
  generatedKey: boolean = false;

  private paramNames: Array<string>;

  // id key type
  idType?: DataType;

  static create(sql: string, params?: Params) {
    return new NamedParamSql(sql, params);
  }

  constructor(sql: string, params?: Params) {
    this.params = params || {};
    this.paramNames = [];
    let status = MatchStatus.State;
    let sqlTmp = '';
    let paramTmp = '';
    for (const c of sql) {
      switch (status) {
        case MatchStatus.State:
          if (c == '$') {
            status = MatchStatus.Param;
            sqlTmp += '?';
          } else {
            sqlTmp += c;
          }
          break;
        case MatchStatus.Param:
          if (c == ' ' || c == ')' || c == EOL || c == ',') {
            this.paramNames.push(paramTmp);
            paramTmp = '';
            status = MatchStatus.State;
            sqlTmp += c;
          } else {
            paramTmp += c;
          }
          break;
      }
    }
    if (paramTmp != '') this.paramNames.push(paramTmp);
    this.sql = sqlTmp;
  }

  private getParamString(name: string): string {
    const param = get(this.params, name);
    if (param == undefined) return `${name}: null`;
    return `${name}: ${param}`;
  }

  private getParam(name: string): any {
    return get(this.params, name);
  }

  getParamArray(): Array<object | undefined> {
    return this.paramNames.map(name => this.getParam(name));
  }

  getParamObject(): {[key: string]: any} {
    const paramObject = {};
    for (const name of this.paramNames) {
      paramObject[name] = this.getParam(name);
    }
    return paramObject;
  }

  toString() {
    if (this.paramNames.length == 0) return `sql: ${this.sql}`;
    return `sql: ${this.sql} params: ${this.paramNames.map(name => this.getParamString(name)).join(', ')}`;
  }
}

