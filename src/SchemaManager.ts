import Schema, {AssociationOptions, ColumnOptions, DataType, SchemaOptions} from './Schema';

export type Columns = {[name: string]: ColumnOptions | DataType | AssociationOptions};

interface AddAssociation {
  name: string;
  current: Schema;
  options: AssociationOptions;
}

export default class SchemaManager {
  readonly schemas = new Map<string, Schema>();
  private addAssociationMap = new Map<string, AddAssociation[]>();
  getSchema(name: string): Schema | undefined {
    return this.schemas.get(name);
  }
  hasSchema(name: string): boolean {
    return this.schemas.has(name);
  }
  addSchema(name: string, columns: Columns, options?: SchemaOptions): Schema {
    const schema = new Schema(this, name, options);
    this.schemas.set(name, schema);
    for (const key of Object.keys(columns)) {
      const options = columns[key];
      if (typeof options == 'string') {
        // data type
        schema.addColumn(key, {type: options});
      } else if ('refName' in options) {
        if (this.schemas.has(options.refName!)) {
          // association
          schema.addAssociation(key, options as AssociationOptions);
        } else {
          const refName = options.refName!;
          let adds: AddAssociation[];
          if (this.addAssociationMap.has(refName)) {
            adds = this.addAssociationMap[refName];
          } else {
            adds = [];
            this.addAssociationMap.set(refName, adds);
          }
          adds.push({current: schema, name: key, options: options as AssociationOptions});
        }
      } else {
        // column
        schema.addColumn(key, options as ColumnOptions);
      }
    }
    const adds = this.addAssociationMap.get(name);
    if (adds) {
      adds.forEach(
        ({current, name, options}) => current.addAssociation(name, options));
      this.addAssociationMap.delete(name);
    }
    return schema;
  }
  removeSchema(name: string) {
    this.schemas.delete(name);
  }
}