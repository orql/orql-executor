import MysqlMigration from '../src/migration/MysqlMigration';
import orqlExecutor from './orqlExecutor';

const migration = new MysqlMigration();

test('test rename table', async () => {
  const session = await orqlExecutor.newSession();
  const oldName = 't1';
  const newName = 't2';
  await session.nativeUpdate(`create table ${oldName} (id int)`);
  await migration.renameTable(session, oldName, newName);
  expect(await migration.existsTable(session, oldName)).toBe(false);
  expect(await migration.existsTable(session, newName)).toBe(true);
  await migration.dropTable(session, newName);
  await session.close();
});