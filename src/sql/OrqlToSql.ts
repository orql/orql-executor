import {
  OrqlCompareExp,
  OrqlCompareOp,
  OrqlExp,
  OrqlItem,
  OrqlAllItem,
  OrqlIgnoreItem,
  OrqlLogicExp,
  OrqlLogicOp,
  OrqlNestExp,
  OrqlNode,
  OrqlParam,
  OrqlValue,
  OrqlColumn
} from 'orql-parser/lib/OrqlNode';
import {
  SqlColumn,
  SqlColumnExp,
  SqlCompareOp,
  SqlCountColumn, SqlDelete,
  SqlExp,
  SqlInnerFrom,
  SqlInsert,
  SqlJoin,
  SqlJoinType,
  SqlLogicExp,
  SqlLogicOp, SqlNestExp,
  SqlOrder,
  SqlPage,
  SqlParam,
  SqlQuery, SqlSet,
  SqlTable,
  SqlTableForm, SqlUpdate,
  SqlValue
} from './SqlNode';
import Schema, {AssociationType, Column} from '../Schema';
import BaseDialect from '../dialect/BaseDialect';
import SqlNode from './SqlNode';
import SchemaManager from '../SchemaManager';
import has = Reflect.has;

interface QueryWrapper {
  currentItem: OrqlItem;
  schema: Schema;
  currentPath?: string;
  isRoot?: boolean;
}

export default class OrqlToSql {
  private sqlCaches = new Map<OrqlNode, SqlNode>();
  private schemaManager;
  private dialect: BaseDialect;
  constructor(schemaManager: SchemaManager, dialect: BaseDialect) {
    this.schemaManager = schemaManager;
    this.dialect = dialect!;
  }
  toQuery(node: OrqlNode, options: {offset?: number, limit?: number} = {}): string {
    let sqlPage = new SqlPage(options.offset, options.limit);
    const root = node.item;
    const op = node.op;
    const rootSchema = this.schemaManager.getSchema(root.name);
    const table = rootSchema.table;
    const select: Array<SqlColumn> = [];
    const joins: Array<SqlJoin> = [];
    const where: Array<SqlExp> = [];
    const orders: Array<SqlOrder> = [];
    // 根节点exp
    let rootExp: SqlExp | undefined = undefined;
    // 根节点order
    const rootOrders: Array<SqlOrder> = [];
    const queryStack: Array<QueryWrapper> = [{currentItem: root, currentPath:table, isRoot: true, schema: rootSchema}];
    // 存在数组关联类型
    let hasArrayRef = false;
    while (queryStack.length > 0) {
      const {currentItem, currentPath, isRoot, schema} = queryStack.pop()!;
      const currentSchema = schema;
      const idColumn = currentSchema.getIdColumn();
      // 是否select id
      let hasSelectId = false;
      // 是否有select
      let hasSelect = false;
      // 是否有all
      let hasAll = false;
      // 忽略项
      const ignores: string[] = [];
      if (currentItem.where) {
        if (currentItem.where.exp) {
          const exp = this.toExp(currentItem.where.exp, currentSchema, currentPath);
          if (isRoot) {
            rootExp = exp;
          } else {
            where.push(exp);
          }
        }
        if (currentItem.where.orders) {
          for (const order of currentItem.where.orders) {
            // 排序项全部列
            const columns = order.columns.map(item => {
              const column = currentSchema.getColumn(item.name)!;
              return new SqlColumn(column.field || column.name, currentPath)
            });
            const sqlOrder = new SqlOrder(order.sort, columns);
            if (isRoot) rootOrders.push(sqlOrder);
            // 嵌套内外order都要一样
            orders.push(sqlOrder);
          }
        }
      }
      if (currentItem.children) {
        for (const childItem of currentItem.children) {
          // 有select
          hasSelect = true;
          if (childItem instanceof OrqlAllItem) {
             hasAll = true;
          } else if (childItem instanceof OrqlIgnoreItem) {
            // remove ignore
            ignores.push(childItem.name);
          } else if (currentSchema.hasColumn(childItem.name)) {
            const column = currentSchema.getColumn(childItem.name)!;
            // 有select id
            if (column.primaryKey) hasSelectId = true;
            if (op == 'query') select.push(new SqlColumn(column.field, currentPath));
          } else if (currentSchema.hasAssociation(childItem.name)) {
            const association = currentSchema.getAssociation(childItem.name)!;
            const childSchema = association.ref;
            const childIdColumn = childSchema.getIdColumn()!;
            const childPath = currentPath != undefined ? `${currentPath}_${childItem.name}` : childItem.name;
            // 入栈
            queryStack.push({currentItem: childItem, currentPath: childPath, schema: childSchema});
            const joinType = association.required ? SqlJoinType.Inner : SqlJoinType.Left;
            switch (association.type) {
              case AssociationType.HasMany:
                if (childItem.children && childItem.children.length > 0) hasArrayRef = true;
                // role hasMany user
                // user.roleId = role.id
                const hasManyOn = new SqlColumnExp(
                  new SqlColumn(association.refKey, childPath),
                  SqlCompareOp.Eq,
                  new SqlColumn(childIdColumn.field, currentPath));
                joins.push(new SqlJoin(childSchema.table, childPath, joinType, hasManyOn));
                break;
              case AssociationType.HasOne:
                // user hasOne info
                // info.userId = user.id
                const hasOneOn = new SqlColumnExp(
                  new SqlColumn(association.refKey, childPath),
                  SqlCompareOp.Eq,
                  new SqlColumn(childIdColumn.field, currentPath));
                joins.push(new SqlJoin(childSchema.table, childPath, joinType, hasOneOn));
                break;
              case AssociationType.BelongsTo:
                // user belongsTo role
                // role.id = user.roleId
                const belongsToOn = new SqlColumnExp(
                  new SqlColumn(association.ref.getIdColumn()!.field, childPath),
                  SqlCompareOp.Eq,
                  new SqlColumn(association.refKey, currentPath));
                joins.push(new SqlJoin(childSchema.table, childPath, joinType, belongsToOn));
                break;
              case AssociationType.BelongsToMany:
                if (childItem.children && childItem.children.length > 0) hasArrayRef = true;
                // post belongsToMany tag middle postTag
                // postTag.postId(refKey) = post.id
                // postTag.tagId(middleKey) = tag.id
                const targetSchema = association.current;
                const middleSchema = association.middle!;
                const refSchema = association.ref;
                const middlePath = `${currentPath}_${middleSchema.name}`;
                const leftOn = new SqlColumnExp(
                  new SqlColumn(association.refKey!, middlePath),
                  SqlCompareOp.Eq,
                  new SqlColumn(childIdColumn.field, currentPath));
                joins.push(new SqlJoin(association.middle!.name, middlePath, joinType, leftOn));
                const rightOn = new SqlColumnExp(
                  new SqlColumn(targetSchema.getIdColumn()!.field, childPath),
                  SqlCompareOp.Eq,
                  new SqlColumn(association.middleKey!, middlePath));
                joins.push(new SqlJoin(refSchema.table, childPath, joinType, rightOn));
                break;
            }
          }
        }
      }
      if (hasAll) {
        // add all
        for (const column of currentSchema.columns) {
          if (!column.refKey && op == 'query' && ignores.indexOf(column.name) < 0) {
            select.push(new SqlColumn(column.field, currentPath));
          }
        }
      }
      if (! hasSelectId && op == 'query' && hasSelect) {
        // 没有select id而且是query而且有select插入id进行mapper
        select.push(new SqlColumn(idColumn!.field, currentPath));
      }
    }
    let query: SqlQuery;
    if (op == 'count') {
      //分页
      select.push(new SqlCountColumn(rootSchema.getIdColumn()!.field, table));
      if (rootExp != null) where.unshift(rootExp);
      const from = new SqlTableForm(new SqlTable(table, table));
      query = new SqlQuery(select, from, where, joins, orders, sqlPage);
    } else if (hasArrayRef && sqlPage.limit != undefined) {
      //嵌套分页查询
      const innerSelect = [new SqlColumn("*")];
      const innerWhere = rootExp != undefined ? [rootExp] : [];
      const innerFrom = new SqlTableForm(new SqlTable(table));
      const from = new SqlInnerFrom(new SqlQuery(innerSelect, innerFrom, innerWhere, [], rootOrders, sqlPage));
      query = new SqlQuery(select, from, where, joins, orders,  new SqlPage());
    } else if (! hasArrayRef && sqlPage.limit == undefined && !root.isArray) {
      //无分页，单个查询，而且没有数组类型关联查询
      if (rootExp != null) where.unshift(rootExp);
      const from = new SqlTableForm(new SqlTable(table, table));
      sqlPage = new SqlPage(undefined, 1);
      query = new SqlQuery(select, from, where, joins, orders, sqlPage);
    } else {
      if (rootExp != null) where.unshift(rootExp);
      const from = new SqlTableForm(new SqlTable(table, table));
      query = new SqlQuery(select, from, where, joins, orders, sqlPage);
    }
    return this.dialect.gen(query);
  }
  private toExp(orqlExp: OrqlExp, parent: Schema, path?: string): SqlExp {
    if (orqlExp instanceof OrqlLogicExp) {
      const left = this.toExp(orqlExp.left, parent);
      const op = orqlExp.op == OrqlLogicOp.And ? SqlLogicOp.And : SqlLogicOp.Or;
      const right = this.toExp(orqlExp.right, parent);
      return new SqlLogicExp(left, op, right);
    }
    if (orqlExp instanceof OrqlCompareExp) {
      const leftColumn = parent.getColumn(orqlExp.left.name)!;
      // FIXME 报错
      const left = new SqlColumn(leftColumn.field, path);
      const op = this.toCompareOp(orqlExp.op);
      let right: Column | OrqlValue | OrqlParam;
      if (orqlExp.right instanceof OrqlColumn) {
        const rightColumn = parent.getColumn(orqlExp.right.name)!;
        // FIXME 报错
        right = new SqlColumn(rightColumn.name, path);
      } else if (orqlExp.right instanceof OrqlValue) {
        right = new SqlValue(orqlExp.right.value);
      } else if (orqlExp.right instanceof OrqlParam) {
        right = new SqlParam(orqlExp.right.name);
      }
      return new SqlColumnExp(left, op, right!);
    }
    if (orqlExp instanceof OrqlNestExp) {
      return new SqlNestExp(this.toExp(orqlExp.exp, parent, path));
    }
    throw new Error('');
  }
  private toLogicOp(orqlLogicOp: OrqlLogicOp): SqlLogicOp {
    switch (orqlLogicOp) {
      case OrqlLogicOp.And:
        return SqlLogicOp.And;
      case OrqlLogicOp.Or:
        return SqlLogicOp.Or;
    }
  }
  private toCompareOp(orqlCompareOp: OrqlCompareOp): SqlCompareOp {
    switch (orqlCompareOp) {
      case OrqlCompareOp.Ge:
        return SqlCompareOp.Ge;
      case OrqlCompareOp.Gt:
        return SqlCompareOp.Gt;
      case OrqlCompareOp.Le:
        return SqlCompareOp.Le;
      case OrqlCompareOp.Lt:
        return SqlCompareOp.Lt;
      case OrqlCompareOp.Eq:
        return SqlCompareOp.Eq;
      case OrqlCompareOp.Ne:
        return SqlCompareOp.Ne;
      case OrqlCompareOp.Like:
        return SqlCompareOp.Like;
    }
  }

  toAdd(node: OrqlNode): string {
    if (this.sqlCaches.has(node)) return this.dialect.gen(this.sqlCaches.get(node)!);
    const root = node.item;
    const columns: SqlColumn[] = [];
    const params: SqlParam[] = [];
    if (root.children == undefined) {
      throw new Error(`add children not exist`);
    }
    const schema = this.schemaManager.getSchema(node.item.name);
    let hasAll = false;
    const ignores: string[] = [];
    for (const item of root.children) {
      if (item instanceof OrqlAllItem) {
        hasAll = true;
      } else if (item instanceof OrqlIgnoreItem) {
        ignores.push(item.name);
      } else if (schema.hasColumn(item.name)) {
        const column = schema.getColumn(item.name);
        columns.push(new SqlColumn(column.field));
        params.push(new SqlParam(column.name));
      } else if (schema.hasAssociation(item.name)) {
        const association = schema.getAssociation(item.name);
        switch (association.type) {
          case AssociationType.BelongsTo:
            columns.push(new SqlColumn(association.refKey));
            params.push(new SqlParam(`${association.name}.${association.ref.getIdColumn()!.name}`));
            break;
        }
      }
    }
    if (hasAll) {
      for (const column of schema.columns) {
        if (!column.refKey && ignores.indexOf(column.name) < 0) {
          columns.push(new SqlColumn(column.field));
          params.push(new SqlParam(column.name));
        }
      }
    }
    const insert = new SqlInsert(schema.table, columns, params);
    this.sqlCaches.set(node, insert);
    return this.dialect.gen(insert);
  }

  toUpdate(node: OrqlNode): string {
    if (this.sqlCaches.has(node)) return this.dialect.gen(this.sqlCaches.get(node)!);
    const root = node.item;
    const schema = this.schemaManager.getSchema(root.name);
    if (root.where == undefined || root.where.exp == undefined) throw new Error('update exp null');
    const exp = this.toExp(root.where.exp, schema, schema.table);
    const sets: SqlSet[] = [];
    if (root.children == undefined) {
      throw new Error(`update not children`);
    }
    let hasAll = false;
    const ignores: string[] = [];
    for (const item of root.children) {
      if (item instanceof OrqlAllItem) {
        hasAll = true;
      } else if (item instanceof OrqlIgnoreItem) {
        ignores.push(item.name);
      } else if (schema.hasColumn(item.name)) {
        const column = schema.getColumn(item.name);
        sets.push(new SqlSet(column.field, column.name));
      } else if (schema.hasAssociation(item.name)) {
        const association = schema.getAssociation(item.name);
        switch (association.type) {
          case AssociationType.BelongsTo:
            sets.push(new SqlSet(association.refKey, `${association.name}.${association.ref.getIdColumn()!.name}`));
            break;
        }
      }
    }
    if (hasAll) {
      for (const column of schema.columns) {
        if (!column.refKey && ignores.indexOf(column.name) < 0) {
          sets.push(new SqlSet(column.field, column.name));
        }
      }
    }
    const update = new SqlUpdate(schema.table, exp, sets);
    this.sqlCaches.set(node, update);
    return this.dialect.gen(update);
  }

  toDelete(node: OrqlNode) {
    if (this.sqlCaches.has(node)) return this.dialect.gen(this.sqlCaches.get(node)!);
    const root = node.item;
    if (root.where == undefined || root.where.exp == undefined) throw new Error('delete exp null');
    const schema = this.schemaManager.getSchema(root.name);
    if (schema == undefined) {
      throw new Error(`schema ${root.name} not exist`);
    }
    const exp = this.toExp(root.where.exp, schema, schema.table);
    const sqlDelete = new SqlDelete(schema.table, exp);
    this.sqlCaches.set(node, sqlDelete);
    return this.dialect.gen(sqlDelete);
  }
}