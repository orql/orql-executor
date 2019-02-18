import {ResultArray, ResultColumn, ResultId, ResultItem, ResultObject, ResultRoot} from './ResultMapper';
import {DataType} from '../Schema';

export interface ResultOptions {
  name?: string;
  type?: DataType;
  id?: boolean;
  object?: boolean;
  array?: boolean;
  column?: boolean;
  field?: string;
  children?: ResultOptions[];
}

export function id(options: ResultOptions = {}): ResultOptions {
  const name = options.name || 'id';
  const field = options.field || name;
  return {id: true, name, field};
}

export function column(name: string, options: ResultOptions = {}): ResultOptions {
  const field = options.field || name;
  return {column: true, name, field};
}

export function object(name: string, children: ResultOptions[]): ResultOptions {
  return {object: true, name, children};
}

export function array(name: string, children: ResultOptions[]): ResultOptions {
  return {array: true, name, children};
}

export default class Mapper {
  static create(children: (ResultOptions | string)[]): ResultRoot {
    let resultId: ResultId;
    const columns: ResultItem[] = [];
    for (const options of children) {
      if (typeof options == 'string') {
        columns.push(new ResultColumn(options, DataType.Never));
      } else {
        if (options.id) {
          resultId = new ResultId(options.name!, options.type || DataType.Never, options.field);
        } else if (options.column) {
          columns.push(new ResultColumn(options.name!, options.type || DataType.Never, options.field));
        } else if (options.object) {
          columns.push(new ResultObject(options.name!, Mapper.create(options.children!)));
        } else if (options.array) {
          columns.push(new ResultArray(options.name!, Mapper.create(options.children!)));
        }
      }
    }
    return new ResultRoot(resultId!, columns);
  }
}