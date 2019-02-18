import NamedParamSql, {Params} from '../src/sql/NamedParamSql';

function create(sql: string, params: Params = {}) {
  return new NamedParamSql(sql, params);
}

test('test simple', () => {
  const named = create('select * from user where id = $id', {id: 1});
  expect(named.sql).toBe('select * from user where id = ?');
  expect(named.getParamArray()).toEqual([1]);
});