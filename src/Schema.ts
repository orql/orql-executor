import SchemaManager from './SchemaManager';

export enum DataType {
  Int = 'int',
  Float = 'float',
  Double = 'double',
  Long = 'long',
  String = 'string',
  Boolean = 'bool',
  Date = 'date',
  Enum = 'enum'
}

export interface ColumnOptions {
  // 类型
  type?: DataType;
  // 长度
  length?: number;
  // 字段
  field?: string;
  // 非空
  required?: boolean;
  // 主键
  primaryKey?: boolean;
  // 自增
  generatedKey?: boolean;
  // 关联schema名
  refName?: string;
  // 关联键
  refKey?: boolean;
  // 中间schema
  middle?: Schema;
  // 中间键名
  middleKey?: string;
  // 默认值
  defaultValue?: string;
  // 初始值
  initialValue?: string;
}

export class Column {
  // 列名
  name: string;
  readonly schema: Schema;
  readonly options: ColumnOptions;
  constructor(schema: Schema, name: string, options: ColumnOptions) {
    this.schema = schema;
    this.name = name;
    this.options = options;
  }
  get primaryKey(): boolean {
    return this.options.primaryKey || false;
  }
  get generatedKey(): boolean {
    return this.options.generatedKey || false;
  }
  get ref(): Schema | undefined {
    return this.schema.schemaManager.getSchema(this.options.refName!);
  }
  get refKey(): boolean {
    return this.options.refKey == true;
  }
  get field(): string {
    return this.options.field || this.name;
  }
  get type(): DataType {
    return this.options.type!;
  }
  get length(): number | undefined {
    return this.options.length || Column.getDefaultLength(this.options.type!);
  }
  get required(): boolean {
    return this.options.required || false;
  }
  // 获取默认长度
  private static getDefaultLength(type: DataType): number | undefined {
    switch (type) {
      case DataType.String:
        return 256;
      default:
        return undefined;
    }
  }
  toJSON() {
    return {
      name: this.name,
      ...this.options
    }
  }
}

export enum AssociationType {
  // 属于
  BelongsTo = 'belongsTo',
  // 拥有一个
  HasOne = 'hasOne',
  // 拥有多个
  HasMany = 'hasMany',
  // 属于多个
  BelongsToMany = 'belongsToMany'
}

export interface AssociationOptions {
  // 关联schema名
  refName?: string;
  // 类型
  type?: AssociationType;
  // 外键
  refKey?: string;
  // 是否必须
  required?: boolean;
  // 中间表
  middleName?: string;
  // 中间表连接ref的外键
  middleKey?: string;
  // 级联操作
  cascade?: 'none' | 'delete';
}

export class Association {
  private schemaManager: SchemaManager;
  name: string;
  readonly current: Schema;
  readonly options: AssociationOptions;
  constructor(schemaManager: SchemaManager, name: string, current:Schema, options: AssociationOptions) {
    this.schemaManager = schemaManager;
    this.name = name;
    this.current = current;
    this.options = options;
  }
  get ref(): Schema {
    return this.schemaManager.getSchema(this.options.refName!)!;
  }
  get refName(): string {
    return this.options.refName!;
  }
  get type(): AssociationType {
    return this.options.type!;
  }
  get required(): boolean {
    return this.options.required || true;
  }
  get refKey(): string {
    return this.options.refKey || Association.getDefaultRefKey(this.name, this.current, this.type);
  }
  get middle(): Schema {
    return this.schemaManager.getSchema(this.middleName!)!;
  }
  get middleName(): string {
    return this.options.middleName!;
  }
  get middleKey(): string {
    // post belongsToMany tag
    // ref tag middle postTag
    // middle key tagId
    return this.options.middleKey || `${this.ref.name}Id`;
  }
  private static getDefaultRefKey(name: string, current: Schema, type: AssociationType): string {
    switch (type) {
      case AssociationType.BelongsTo:
        // user belongsTo role  user.roleId
        return `${name}Id`;
      case AssociationType.HasOne:
        // user hasOne info  info.userId
        return `${name}Id`;
      case AssociationType.HasMany:
        // role hasMany users  user.roleId
        return `${current.name}Id`;
      case AssociationType.BelongsToMany:
        // post belongsToMany tags  middle.postId
        return `${current.name}Id`;
    }
  }
  toJSON() {
    return {
      name: this.name,
      ...this.options
    }
  }
}

export interface SchemaOptions {
  // 表名
  table?: string;
}

export default class Schema {
  // schema名
  name: string;
  private idColumn?: Column;
  readonly columns: Column[] = [];
  readonly options: SchemaOptions;
  readonly associations: Association[] = [];
  readonly schemaManager: SchemaManager;
  constructor(schemaManager: SchemaManager, name: string, options: SchemaOptions = {}) {
    this.schemaManager = schemaManager;
    this.name = name;
    this.options = options;
  }
  get table(): string {
    return this.options.table || this.name;
  }

  private createColumn(name: string, options: ColumnOptions): Column {
    const column = new Column(this, name, options);
    if (column.primaryKey) this.idColumn = column;
    return column;
  }

  /**
   * 添加column
   * @param name
   * @param options
   */
  addColumn(name: string, options: ColumnOptions): Schema {
    const column = this.createColumn(name, options);
    this.columns.push(column);
    return this;
  }

  /**
   * 修改column
   * @param oldName
   * @param newName
   * @param options
   */
  updateColumn(oldName: string, newName: string, options: ColumnOptions): Schema {
    const index = this.columns.findIndex(column => column.name == oldName);
    this.columns[index] = this.createColumn(newName, options);
    return this;
  }

  /**
   * 删除column
   * @param name
   */
  deleteColumn(name: string) {
    const index = this.columns.findIndex(column => column.name == name);
    if (index >= 0) this.columns.splice(index, 1);
  }

  /**
   * 判断是否有column
   * @param name
   */
  hasColumn(name: string): boolean {
    return this.columns.find(column => column.name == name) != undefined;
  }

  /**
   * 判断是否有association
   * @param name
   */
  hasAssociation(name: string): boolean {
    return this.associations.find(association => association.name == name) != undefined;
  }

  /**
   * 获取column
   * @param name
   */
  getColumn(name: string): Column | undefined {
    return this.columns.find(column => column.name == name);
  }

  /**
   * 获取主键
   */
  getIdColumn(): Column | undefined {
    return this.idColumn;
  }

  /**
   * 获取association
   * @param name
   */
  getAssociation(name: string): Association | undefined {
    return this.associations.find(association => association.name == name);
  }

  /**
   * 添加关联column
   * @param name
   * @param type
   * @param length
   * @param refName
   */
  private addRefColumn(name: string, type: DataType, length: number | undefined, refName: string) {
    if (this.hasColumn(name)) return;
    this.addColumn(name, {type, refKey: true, refName, length});
  }

  private createAssociation(name: string, options: AssociationOptions) {
    const association = new Association(this.schemaManager, name, this, options);
    switch (association.type) {
      case AssociationType.HasOne:
      case AssociationType.HasMany:
        // 插入外键到ref
        const id = this.getIdColumn()!;
        association.ref.addRefColumn(association.refKey, id.type, id.length, association.refName);
        break;
      case AssociationType.BelongsTo:
        // 插入外键
        const refId = association.ref.getIdColumn()!;
        this.addRefColumn(association.refKey, refId.type, refId.length, association.refName);
        break;
    }
    return association;
  }

  /**
   * 添加association
   * @param name
   * @param options
   */
  addAssociation(name: string, options: AssociationOptions): Schema {
    const association = this.createAssociation(name, options);
    this.associations.push(association);
    return this;
  }

  /**
   * 删除association
   * @param name
   */
  deleteAssociation(name: string) {
    const index = this.associations.findIndex(association => association.name == name);
    if (index >= 0) this.associations.splice(index, 1);
  }

  /**
   * 修改association
   * @param oldName
   * @param name
   * @param options
   */
  updateAssociation(oldName: string, name: string, options: AssociationOptions) {
    const association = this.createAssociation(name, options);
    const index = this.associations.findIndex(association => association.name == oldName);
    this.associations[index] = association;
  }

  /**
   * 获取外键
   * @param name
   */
  getAssociationRefColumn(name: string): Column {
    const association = this.getAssociation(name)!;
    switch (association.type) {
      case AssociationType.HasOne:
      case AssociationType.HasMany:
        return association.ref.getColumn(association.refKey)!;
      case AssociationType.BelongsTo:
        return this.getColumn(association.refKey)!;
    }
    throw new Error('');
  }

  toJSON() {
    return {
      name: this.name,
      table: this.options.table,
      columns: this.columns,
      associations: this.associations
    }
  }
}
