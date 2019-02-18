import {OrqlItem, OrqlAllItem, OrqlIgnoreItem} from 'orql-parser/lib/OrqlNode';
import {ResultArray, ResultColumn, ResultId, ResultItem, ResultObject, ResultRoot} from './ResultMapper';
import SchemaManager from '../SchemaManager';
import Schema from '../Schema';

/**
 * 负责将orql node转化为result mapper
 */
export default class OrqlResultMapper {
  private caches = new Map<OrqlItem, ResultRoot>();
  private schemaManager: SchemaManager;
  constructor(schemaManager: SchemaManager) {
    this.schemaManager = schemaManager;
  }
  toResult(item: OrqlItem): ResultRoot {
    if (this.caches.has(item)) return this.caches.get(item)!;
    const schema = this.schemaManager.getSchema(item.name)!;
    // FIXME 抛出异常
    const resultRoot = this._toResult(item, schema, schema.table);
    this.caches.set(item, resultRoot);
    return resultRoot;
  }
  private _toResult(refItem: OrqlItem, schema: Schema, path?: string): ResultRoot {
    let resultId: ResultId | undefined;
    const columns: Array<ResultItem> = [];
    let hasAll = false;
    const ignores: string[] = [];
    for (const item of refItem.children!) {
      if (item instanceof OrqlAllItem) {
        hasAll = true;
      } else if (item instanceof OrqlIgnoreItem) {
        ignores.push(item.name);
      } else if (schema.hasColumn(item.name)) {
        const column = schema.getColumn(item.name)!;
        // FIXME
        const columnPath = path != undefined ? `${path}_${column.field}` : column.field;
        if (column.primaryKey) {
          resultId = new ResultId(column.name, column.type, columnPath);
        } else {
          const resultColumn = new ResultColumn(column.name, column.type, columnPath);
          columns.push(resultColumn);
        }
      } else if (schema.hasAssociation(item.name)) {
        if (item.children == undefined || item.children.length == 0) continue;
        const itemPath = path != undefined ? `${path}_${item.name}` : item.name;
        const association = schema.getAssociation(item.name)!;
        if (item.isArray) {
          const rootResult = this._toResult(item, association.ref, itemPath);
          const resultObject = new ResultArray(item.name, rootResult);
          columns.push(resultObject);
        } else {
          const rootResult = this._toResult(item, association.ref, itemPath);
          const resultObject = new ResultObject(item.name, rootResult);
          columns.push(resultObject);
        }
      }
    }
    if (hasAll) {
      for (const column of schema.columns) {
        if (!column.refKey && ignores.indexOf(column.name) < 0) {
          const columnPath = path != undefined ? `${path}_${column.field}` : column.field;
          if (column.primaryKey) {
            resultId = new ResultId(column.name, column.type, columnPath);
          } else {
            const resultColumn = new ResultColumn(column.name, column.type, columnPath);
            columns.push(resultColumn);
          }
        }
      }
    }
    if (resultId == undefined) {
      // 插入id用于mappe
      const idColumn = schema.getIdColumn()!;
      const columnPath = path != undefined ? `${path}_${idColumn.field}` : idColumn.field;
      resultId = new ResultId(idColumn.name, idColumn.type, columnPath);
    }
    return new ResultRoot(resultId!, columns);
  }
}