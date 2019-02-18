import SqlNode, {
  SqlColumn,
  SqlColumnExp,
  SqlCompareOp,
  SqlCountColumn, SqlDelete,
  SqlExp,
  SqlForm,
  SqlInnerFrom, SqlInsert,
  SqlJoin,
  SqlJoinType,
  SqlLogicExp,
  SqlLogicOp, SqlNestExp, SqlOrder, SqlPage,
  SqlParam,
  SqlQuery,
  SqlTable,
  SqlTableForm, SqlUpdate,
  SqlValue
} from '../sql/SqlNode';

export default class BaseDialect {
  gen(node: SqlNode): string {
    if (node instanceof SqlQuery) return this.genQuery(node);
    if (node instanceof SqlInsert) return this.genInsert(node);
    if (node instanceof SqlUpdate) return this.genUpdate(node);
    if (node instanceof SqlDelete) return this.genDelete(node);
    throw new Error('');
  }
  protected genQuery(sqlQuery: SqlQuery): string {
    return 'select ' +
      this.genSelect(sqlQuery.select) +
      this.genFrom(sqlQuery.from) +
      this.genJoins(sqlQuery.joins) +
      this.genWhere(sqlQuery.where) +
      this.genOrders(sqlQuery.orders) +
      this.genPage(sqlQuery.page!);
  }
  protected genSelect(select: Array<SqlColumn>): string {
    return select.map(column => this.genSelectColumn(column)).join(', ');
  }

  protected genSelectColumn(column: SqlColumn): string {
    if (column instanceof SqlCountColumn) return `count(${column.name})`;
    return column.table != undefined ? `${column.table}.${column.name} as ${column.table}_${column.name}` : column.name;
  }

  protected genFrom(from: SqlForm): string {
    if (from instanceof SqlTableForm) return this.genFromSqlTable(from.table);
    if (from instanceof SqlInnerFrom) {
      const innerQuery = from.query;
      // 只支持一层嵌套
      return ` from (${this.genQuery(innerQuery)}) as ${(innerQuery.from as SqlTableForm).table.name}`
    }
    throw new Error('');
  }

  protected genFromSqlTable(sqlTable: SqlTable): string {
    if (sqlTable.alias) return ` from ${sqlTable.name} as ${sqlTable.alias}`;
    return ` from ${sqlTable.name}`;
  }

  protected genJoins(joins: Array<SqlJoin>): string {
    if (joins.length == 0) return '';
    return joins.map(join => this.genJoin(join)).join(' ');
  }

  protected genJoin(join: SqlJoin): string {
    const joinSql = join.type == SqlJoinType.Inner ? " inner join " : " left join ";
    const expSql = this.genExp(join.on);
    return joinSql + join.table + " as "  + join.alias + " on " + expSql;
  }

  protected genExp(exp: SqlExp): string {
    if (exp instanceof SqlLogicExp) {
      const left = this.genExp(exp.left);
      const op = this.genLogicOp(exp.op);
      const right = this.genExp(exp.right);
      return `${left} ${op} ${right}`;
    } else if (exp instanceof SqlColumnExp) {
      const left = this.genColumn(exp.left);
      const op = this.genCompareOp(exp.op);
      let right = '';
      if (exp.right instanceof SqlColumn) {
        right = this.genColumn(exp.right);
      } else if (exp.right instanceof SqlValue) {
        right = this.genValue(exp.right);
      } else if (exp.right instanceof SqlParam) {
        right = this.genParam(exp.right);
      }
      if (op == '=' && right == 'null') {
        return `${left} is null`;
      }
      if (op == '<>' && right == 'null') {
        return `${left} is not null`;
      }
      return `${left} ${op} ${right!}`;
    } else if (exp instanceof SqlNestExp) {
      return `(${this.genExp(exp.exp)})`;
    }
    throw new Error('');
  }

  protected genColumn(column: SqlColumn): string {
    return column.table != undefined ? `${column.table}.${column.name}` : column.name;
  }

  protected genParam(param: SqlParam) {
    return `$${param.name}`;
  }

  protected genValue(right: SqlValue) {
    if (typeof right.value == 'string') return JSON.stringify(right.value);
    return `${right.value}`;
  }

  protected genCompareOp(op: SqlCompareOp): string {
    switch (op) {
      case SqlCompareOp.Eq:
        return '=';
      case SqlCompareOp.Ge:
        return '>=';
      case SqlCompareOp.Gt:
        return '>';
      case SqlCompareOp.Le:
        return '<=';
      case SqlCompareOp.Lt:
        return '<';
      case SqlCompareOp.Ne:
        return '<>';
      case SqlCompareOp.Like:
        return 'like';
    }
  }

  protected genLogicOp(op: SqlLogicOp): string {
    return op == SqlLogicOp.And ? '&&' : '||';
  }

  protected genWhere(where: Array<SqlExp>) {
    if (where.length == 0) return '';
    return ' where ' + where.map(exp => this.genExp(exp)).join(' and ');
  }

  protected genOrders(orders: Array<SqlOrder>) {
    if (orders.length == 0) return '';
    return ' order by ' + orders.map(order => order.columns.map(column => column.name).join(', ') + ' ' + order.sort).join(' ');
  }

  protected genPage(page: SqlPage): string {
    if (page.limit == undefined) return '';
    return page.offset != undefined ? ` limit ${page.offset}, ${page.limit}`: ` limit ${page.limit}`;
  }

  protected genInsert(insert: SqlInsert): string {
    return `insert into ${insert.table} ` +
      `(${insert.columns.map(column => column.name).join(', ')}) ` +
      `values (${insert.params.map(param => `$${[param.name]}`).join(', ')})`;
  }

  protected genUpdate(update: SqlUpdate): string {
    return `update ${update.table} ` +
      `set ${update.sets.map(set => `${set.name} = $${set.param}`).join(', ')} ` +
      `where ${this.genExp(update.where)}`
  }

  protected genDelete(node: SqlDelete) {
    return `delete from ${node.table} where ${this.genExp(node.where)}`;
  }
}