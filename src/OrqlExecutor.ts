import Configuration, {ConfigurationOptions} from './Configuration';
import Session from './Session';
import Schema, {SchemaOptions} from './Schema';
import {Columns} from './SchemaManager';

export default class OrqlExecutor {
  readonly configuration: Configuration;
  constructor(options: ConfigurationOptions) {
    this.configuration = new Configuration(options);
  }
  async newSession(): Promise<Session> {
    const connect = await this.configuration.database!.getConnect(this.configuration.connectionOptions!);
    return new Session(this.configuration, connect);
  }

  /**
   * add schema
   * @param name  schema name
   * @param columns columns data type or column options or association options
   * @param options
   */
  addSchema(name, columns: Columns, options?: SchemaOptions): Schema {
    return this.configuration.schemaManager.addSchema(name, columns, options);
  }
  getSchema(name): Schema | undefined {
    return this.configuration.schemaManager.getSchema(name);
  }
  removeSchema(name: string) {
    this.configuration.schemaManager.removeSchema(name);
  }
  async sync(type: 'create' | 'update' | 'drop') {
    const session = await this.newSession();
    const migration = this.configuration.migration!;
    switch (type) {
      case 'create':
        await migration.create(session);
        break;
      case 'update':
        await migration.update(session);
        break;
      case 'drop':
        await migration.drop(session);
        await migration.create(session);
        break;
    }
    await session.close();
  }
}