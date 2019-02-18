import SchemaManager from './SchemaManager';

export enum DataType {
  Int = 'int',
  Float = 'float',
  Long = 'long',
  String = 'string',
  Boolean = 'bool',
  Date = 'date',
  Enum = 'enum',
  Never = 'never'
}

export interface ColumnOptions {
  type?: DataType;
  length?: number;
  field?: string;
  required?: boolean;
  pkAndGk?: boolean;
  primaryKey?: boolean;
  generatedKey?: boolean;
  refName?: string;
  refKey?: boolean;
  middle?: Schema;
  middleKey?: string;
}

export class Column {
  readonly name: string;
  readonly schemaManager: SchemaManager;
  readonly options: ColumnOptions;
  constructor(schemaManager: SchemaManager, name: string, options: ColumnOptions) {
    this.schemaManager = schemaManager;
    this.name = name;
    this.options = options;
  }
  get primaryKey(): boolean {
    return this.options.pkAndGk || this.options.primaryKey || false;
  }
  get generatedKey(): boolean {
    return this.options.pkAndGk || this.options.generatedKey || false;
  }
  get ref(): Schema | undefined {
    return this.schemaManager.getSchema(this.options.refName!);
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
  private static getDefaultLength(type: DataType): number | undefined {
    switch (type) {
      case DataType.String:
        return 256;
      default:
        return undefined;
    }
  }
}

export enum AssociationType {
  BelongsTo = 'belongsTo',
  HasOne = 'hasOne',
  HasMany = 'hasMany',
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
  readonly name: string;
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
}

export interface SchemaOptions {
  table?: string;
}

export default class Schema {
  readonly name: string;
  private idColumn?: Column;
  readonly columns: Column[] = [];
  readonly columnNames: string[] = [];
  readonly options: SchemaOptions;
  private associations: Association[] = [];
  private associationNames: string[] = [];
  private schemaManager: SchemaManager;
  constructor(schemaManager: SchemaManager, name: string, options: SchemaOptions = {}) {
    this.schemaManager = schemaManager;
    this.name = name;
    this.options = options;
  }
  get table(): string {
    return this.options.table || this.name;
  }
  addColumn(name: string, options: ColumnOptions): Schema {
    const column = new Column(this.schemaManager, name, options);
    if (column.primaryKey) this.idColumn = column;
    this.columnNames.push(column.name);
    this.columns.push(column);
    return this;
  }
  hasColumn(name: string): boolean {
    return this.columnNames.indexOf(name) >= 0;
  }
  hasAssociation(name: string): boolean {
    return this.associationNames.indexOf(name) >= 0;
  }
  getColumn(name: string): Column | undefined {
    const index = this.columnNames.indexOf(name);
    return this.columns[index];
  }
  getIdColumn(): Column | undefined {
    return this.idColumn;
  }
  getAssociation(name: string): Association | undefined {
    const index = this.associationNames.indexOf(name);
    return this.associations[index];
  }
  private addRefColumn(name: string, type: DataType, length: number | undefined, refName: string) {
    if (this.columnNames.indexOf(name) >= 0) return;
    this.addColumn(name, {type, refKey: true, refName, length});
  }
  addAssociation(name: string, options: AssociationOptions): Schema {
    const association = new Association(this.schemaManager, name, this, options);
    this.associationNames.push(association.name);
    this.associations.push(association);
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
    return this;
  }
}
