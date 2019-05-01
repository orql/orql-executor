import Session from '../Session';
import Schema, {Column} from '../Schema';

export interface DatabaseColumn {
  name: string;
  nullable: boolean;
  type: string;
  length?: number;
}

export default interface Migration {
  /**
   * 创建全部表
   * @param session
   */
  create(session: Session): Promise<void>;

  /**
   * 修改全部表
   * @param session
   */
  update(session: Session): Promise<void>;

  /**
   * 删除全部表
   * @param session
   */
  drop(session: Session): Promise<void>;

  /**
   * 创建表
   * @param session
   * @param schema
   */
  createTable(session: Session, schema: Schema): Promise<void>;

  /**
   * 是否存在表
   * @param session
   * @param Session
   * @param schema
   */
  existsTable(session, Session, schema: Schema): Promise<boolean>;

  /**
   * 添加列
   * @param session
   * @param schema
   * @param column
   */
  addColumn(session: Session, schema: Schema, column: Column): Promise<void>;

  /**
   * 查询列
   * @param session
   * @param schema
   * @param column
   */
  queryColumn(session: Session, schema: Schema, column: Column): Promise<DatabaseColumn | undefined>;

  /**
   * 查询全部列
   * @param session
   * @param schema
   */
  queryAllColumn(session: Session, schema: Schema): Promise<DatabaseColumn[]>;

  /**
   * 判断列有无更改
   * @param column
   * @param databaseColumn
   */
  shouldUpdateColumn(column: Column, databaseColumn: DatabaseColumn): boolean;

  /**
   * 更改列
   * @param session
   * @param schema
   * @param column
   */
  updateColumn(session: Session, schema: Schema, column: Column): Promise<void>;

}