import BaseDialect from './BaseDialect';
import {SqlLogicOp} from '../sql/SqlNode';

export = class SqliteDialect3 extends BaseDialect {
  protected genLogicOp(op: SqlLogicOp): string {
    return op == SqlLogicOp.And ? 'and' : 'or';
  }
}