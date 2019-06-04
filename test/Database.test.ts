import MysqlDriver from '../src/database/Mysql';
import NamedParamSql from '../src/sql/NamedParamSql';
import {Connection} from '../src/database/Database';

const mysqlDriver = new MysqlDriver();

async function getMysqlConnect() {
  return await mysqlDriver.getConnect({
    host: 'localhost',
    username: 'root',
    database: 'baas'
  });
}

async function transaction(call: (connect: Connection) => void) {
  const connect = await getMysqlConnect();
  await connect.beginTransaction();
  await call(connect);
  await connect.rollback();
  await connect.close();
}

beforeAll(async () => {
  const connect = await getMysqlConnect();
  await connect.update(NamedParamSql.create('create table tmp_user(id int primary key auto_increment, name varchar(16) not null)'));
  await connect.close();
});

afterAll(async () => {
  const connect = await getMysqlConnect();
  await connect.update(NamedParamSql.create('drop table tmp_user'));
  await connect.close();
});

test('test connect', async () => {
  const connect = await getMysqlConnect();
  expect(connect).not.toBeNull();
  await connect.close();
});

test('test connect fail', async () => {
  const fail = async () => await mysqlDriver.getConnect({
    host: 'localhost',
    username: 'u',
    database: 'baas'
  });
  expect(fail()).rejects.toThrow();
});

test('test query', async () => {
  await transaction(async connect => {
    const {results, fields} = await connect.query(new NamedParamSql('select 1'));
    expect(results[0][fields[0]]).toBe(1);
  });
});

test('test add', async () => {
  await transaction(async connect => {
    const id = await connect.add(new NamedParamSql('insert into tmp_user (name) values ($name)', {name: 'n1'}));
    const {results} = await connect.query(NamedParamSql.create('select * from tmp_user where id = $id', {id}));
    expect(results[0].name).toBe('n1');
  });
});

test('test update', async () => {
  await transaction(async connect => {
    const id = await connect.add(new NamedParamSql('insert into tmp_user (name) values ($name)', {name: 'n1'}));
    const row = await connect.update(NamedParamSql.create('update tmp_user set name = $name where id = $id', {name: 'n2', id}));
    expect(row).toBe(1);
    const {results} = await connect.query(NamedParamSql.create('select * from tmp_user where id = $id', {id}));
    expect(results[0].name).toBe('n2');
  });
});

test('test delete', async () => {
  await transaction(async connect => {
    const id = await connect.add(new NamedParamSql('insert into tmp_user (name) values ($name)', {name: 'n1'}));
    const row = await connect.delete(NamedParamSql.create('delete from tmp_user where id = $id', {id}));
    expect(row).toBe(1);
    const {results} = await connect.query(NamedParamSql.create('select * from tmp_user where id = $id', {id}));
    expect(results.length).toBe(0);
  });
});

test('test commit', async () => {
  const con1 = await getMysqlConnect();
  await con1.beginTransaction();
  const id = await con1.add(NamedParamSql.create('insert into tmp_user (name) values ($name)', {name: 'n1'}));
  await con1.commit();
  await con1.close();

  const con2 = await getMysqlConnect();
  const {results} = await con2.query(NamedParamSql.create('select * from tmp_user where id = $id', {id}));
  expect(results.length).toBe(1);
  expect(results[0].name).toBe('n1');
  await con2.close();
});