import Session from './Session';
import {Params} from './sql/NamedParamSql';

export default class UpdateBuilder {
  private session: Session;
  constructor(session: Session) {
    this.session = session;
  }
  async add(name: string, data: Params) {
    const schema = this.session.getSchema(name)!;
    const items: string[] = [];
    for (const key of Object.keys(data)) {
      if (schema.hasColumn(key) || schema.hasAssociation(key)) {
        if (data[key] != undefined) {
          items.push(key);
        }
      }
    }
    if (items.length == 0) return;
    const orql = `add ${name}: {${items.join(', ')}}`
    const idValue = await this.session.add(orql, data);
    const idColumn = schema.getIdColumn()!;
    if (idColumn && idColumn.generatedKey) data[idColumn.name] = idValue;
  }
  async delete(name: string, data: Params) {
    const schema = this.session.getSchema(name)!;
    const idColumn = schema.getIdColumn()!;
    const id = data[idColumn.name];
    const orql = `delete ${name}(${idColumn.name} = $id)`
    await this.session.delete(orql, {id});
  }
  async update(name: string, data: Params) {
    const schema = this.session.getSchema(name)!;
    const items: string[] = [];
    const idColumn = schema.getIdColumn()!;
    for (const key of Object.keys(data)) {
      if (schema.hasColumn(key) || schema.hasAssociation(key)) {
        if (data[key] != undefined) {
          items.push(key);
        }
      }
    }
    if (items.length == 0) return;
    const orql = `update ${name}(${idColumn.name} = $id): {${items.join(', ')}}`;
    await this.session.update(orql, data);
  }
}