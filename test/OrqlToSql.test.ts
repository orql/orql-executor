import orqlMapper from './orqlMapper';
import OrqlToSql from '../src/sql/OrqlToSql';
import MysqlDialect from '../src/dialect/MysqlDialect';
import Parser from 'orql-parser';

const orqlToSql = new OrqlToSql(orqlMapper.configuration.schemaManager, new MysqlDialect());

function toQuerySql(orql: string, options: {offset?: number, limit?: number} = {}): string {
  const node = Parser.parse(orql);
  return orqlToSql.toQuery(node, options);
}

function toAddSql(orql: string): string {
  const node = Parser.parse(orql);
  return orqlToSql.toAdd(node);
}

function toUpdate(orql: string): string {
  const node = Parser.parse(orql);
  return orqlToSql.toUpdate(node);
}

function toDelete(orql: string): string {
  const node = Parser.parse(orql);
  return orqlToSql.toDelete(node);
}

test('test query by id', () => {
  const sql = 'select user.id as user_id, user.name as user_name from user as user where user.id = $id limit 1';
  const orql = 'query user(id = $id) : {id, name}';
  expect(sql).toBe(toQuerySql(orql));
});

test('test query belongsTo', () => {
  const sql = 'select ' +
    'user.id as user_id, ' +
    'user.name as user_name, ' +
    'user_role.id as user_role_id, ' +
    'user_role.name as user_role_name ' +
    'from user as user ' +
    'inner join role as user_role on user_role.id = user.roleId ' +
    'limit 1';
  const orql = 'query user : {id, name, role: {id, name}}';
  expect(sql).toBe(toQuerySql(orql));
});

test('test nest page', () => {
  const sql = 'select ' +
    'user.id as user_id, ' +
    'user.name as user_name, ' +
    'user_posts.id as user_posts_id, ' +
    'user_posts.title as user_posts_title ' +
    'from (select * from user as user limit 0, 10) as user ' +
    'inner join post as user_posts on user_posts.authorId = user.id';
  const orql = 'query user : [id, name, posts: [id, title]]';
  expect(sql).toBe(toQuerySql(orql, {offset: 0, limit: 10}));
});

test('test add', () => {
  const sql = 'insert into user (name, password) values ($name, $password)'
  const orql = 'add user : {name, password}';
  expect(sql).toBe(toAddSql(orql));
});

test('test add belongsTo', () => {
  const sql = 'insert into user (name, password, roleId) values ($name, $password, $role.id)'
  const orql = 'add user : {name, password, role}';
  expect(sql).toBe(toAddSql(orql));
});

test('test update', () => {
  const sql = 'update user set name = $name where user.id = $id';
  const orql = 'update user(id = $id) : {name}';
  expect(sql).toBe(toUpdate(orql));
});

test('test update belongsTo', () => {
  const sql = 'update user set roleId = $role.id where user.id = $id';
  const orql = 'update user(id = $id) : {role}';
  expect(sql).toBe(toUpdate(orql));
});

test('test delete', () => {
  const sql = 'delete from user where user.id = $id';
  const orql = 'delete user(id = $id)';
  expect(sql).toBe(toDelete(orql));
});

test('test delete all', () => {
  const sql = 'delete from user where user.id > 0';
  const orql = 'delete user(id > 0)';
  expect(sql).toBe(toDelete(orql));
});

test('test nest exp', () => {
  const sql = 'select user.id as user_id, user.name as user_name from user as user where (user.id = $id) limit 1';
  const orql = 'query user((id = $id)) : {id, name}';
  expect(sql).toBe(toQuerySql(orql));
});