import {DataType} from '../Schema';

export class ResultRoot {
  readonly id: ResultId;
  readonly columns: ResultItem[];
  constructor(id: ResultId, columns: Array<ResultItem>) {
    this.id = id;
    this.columns = columns;
  }
}

export class ResultItem {
  // 对象属性
  readonly column: string;
  constructor(column: string) {
    this.column = column;
  }
}

// 普通列
export class ResultColumn extends ResultItem {
  // 数据库列
  readonly field: string;
  readonly type: DataType;
  constructor(column: string, type: DataType, field: string = column) {
    super(column);
    this.field = field;
    this.type = type;
  }
}

// id列
export class ResultId extends ResultColumn {

}

// 关联对象
export class ResultRef extends ResultItem {
  // 子对象
  readonly root: ResultRoot;
  constructor(column: string, root: ResultRoot) {
    super(column);
    this.root = root;
  }
}

// object对象
export class ResultObject extends ResultRef {

}

// 数组对象
export class ResultArray extends ResultRef {

}

// query results mapper
export default class ResultMapper {
  mappe(resultRoot: ResultRoot, results: any[]): any[] {
    const data: any[] = [];
    const resultId = resultRoot.id;
    // 按id切割, {id: {}[]}
    const idListMap = new Map<object, any[]>();
    for (const result of results) {
      const idValue = result[resultId.field];
      // 避免undefined列被映射
      if (idValue == undefined) continue;
      if (! idListMap.has(idValue)) idListMap.set(idValue, []);
      idListMap.get(idValue)!.push(result);
    }
    for (const [idValue, idResults] of idListMap) {
      const childData: any = {};
      // 从第一列获取数据
      const idResult = idResults[0];
      childData[resultId.column] = idValue;
      for (const resultItem of resultRoot.columns) {
        if (resultItem instanceof ResultColumn) {
          childData[resultItem.column] = idResult[resultItem.field];
        } else if (resultItem instanceof ResultRef) {
          const nestRecord = this.mappe(resultItem.root, idResults);
          if (resultItem instanceof ResultObject) {
            // 只填入一个值
            childData[resultItem.column] = nestRecord.length == 0 ? undefined : nestRecord[0];
          } else if (resultItem instanceof ResultArray) {
            childData[resultItem.column] = nestRecord;
          }
        }
      }
      data.push(childData);
    }
    return data;
  }
}