export default class SqlNode {}

/**
 * 数据操作
 */
export class SqlDML extends SqlNode {}

export class SqlInsert extends SqlDML {
  readonly table: string;
  readonly columns: SqlColumn[];
  readonly params: SqlParam[];
  constructor(table: string, columns: Array<SqlColumn>, params: Array<SqlParam>) {
    super();
    this.table = table;
    this.columns = columns;
    this.params = params;
  }
}

export class SqlDelete extends SqlDML {
  readonly table: string;
  readonly where: SqlExp;
  constructor(table: string, where: SqlExp) {
    super();
    this.table = table;
    this.where = where;
  }
}

export class SqlUpdate extends SqlDML {
  readonly table: string;
  readonly where: SqlExp;
  readonly sets: SqlSet[];
  constructor(table: string, where: SqlExp, sets: SqlSet[]) {
    super();
    this.table = table;
    this.where = where;
    this.sets = sets;
  }
}

export class SqlQuery extends SqlDML {
  readonly select: Array<SqlColumn>;
  readonly from: SqlForm;
  readonly where: Array<SqlExp>;
  readonly joins: Array<SqlJoin>;
  readonly page?: SqlPage;
  readonly orders: Array<SqlOrder>;
  constructor(select: Array<SqlColumn>, from: SqlForm, where: Array<SqlExp>, joins: Array<SqlJoin>, orders: Array<SqlOrder>, page?: SqlPage) {
    super();
    this.select = select;
    this.from = from;
    this.where = where;
    this.joins = joins;
    this.page = page;
    this.orders = orders;
  }
}

export class SqlExp {}

export class SqlLogicExp extends SqlExp {
  readonly left: SqlExp;
  readonly op: SqlLogicOp;
  readonly right: SqlExp;
  constructor(left: SqlExp, op: SqlLogicOp, right: SqlExp) {
    super();
    this.left = left;
    this.op = op;
    this.right = right;
  }
}

export class SqlColumnExp extends SqlExp {
  readonly left: SqlColumn;
  readonly op: SqlCompareOp;
  readonly right: SqlColumn | SqlParam | SqlValue;
  constructor(left: SqlColumn, op: SqlCompareOp, right: SqlColumn | SqlParam | SqlValue) {
    super();
    this.left = left;
    this.op = op;
    this.right = right;
  }
}

export class SqlNestExp extends SqlExp {
  readonly exp: SqlExp;
  constructor(exp: SqlExp) {
    super();
    this.exp = exp;
  }
}

export class SqlParam {
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
}

export class SqlValue {
  readonly value: any;
  constructor(value: any) {
    this.value = value;
  }
}

export enum SqlCompareOp {
  Ge,
  Gt,
  Eq,
  Le,
  Lt,
  Ne,
  Like
}

export enum SqlLogicOp {
  And,
  Or
}

export class SqlColumn {
  readonly name: string;
  readonly table?: string;
  constructor(name: string, table?: string) {
    this.name = name;
    this.table = table;
  }
}

export class SqlCountColumn extends SqlColumn {

}

export class SqlSet {
  readonly name: string;
  readonly param: string;
  constructor(name: string, param: string) {
    this.name = name;
    this.param = param;
  }
}

export class SqlForm {}

export class SqlTableForm extends SqlForm {
  readonly table: SqlTable;
  constructor(table: SqlTable) {
    super();
    this.table = table;
  }
}

export class SqlInnerFrom extends SqlForm {
  readonly query: SqlQuery;
  constructor(query: SqlQuery) {
    super();
    this.query = query;
  }
}

export class SqlJoin {
  readonly table: string;
  readonly alias: string;
  readonly type: SqlJoinType;
  readonly on: SqlExp;
  constructor(table: string, alias: string, type: SqlJoinType, on: SqlExp) {
    this.table = table;
    this.alias = alias;
    this.type = type;
    this.on = on;
  }
}

export enum SqlJoinType {
  Inner,
  Left
}

export class SqlPage {
  offset?: number;
  limit?: number;
  constructor(offset?: number, limit?: number) {
    this.offset = offset;
    this.limit = limit;
  }
}

export class SqlOrder {
  readonly sort: string;
  readonly columns: Array<SqlColumn>;
  constructor(sort: string, columns: Array<SqlColumn>) {
    this.sort = sort;
    this.columns = columns;
  }
}

export class SqlTable {
  readonly name: string;
  readonly alias: string;
  constructor(name: string, alias: string = name) {
    this.name = name;
    this.alias = alias;
  }
}