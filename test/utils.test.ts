import {get} from '../src/utils';

test('test get', () => {
  const v1 = {a: 'a'};
  expect('a').toBe(get(v1, 'a'));
  const v2 = {a: {b: 'b'}};
  expect('b').toBe(get(v2, 'a.b'));
  const v3 = ['a'];
  expect('a').toBe(get(v3, '[0]'));
  const v4 = [{a: 'a'}];
  expect('a').toBe(get(v4, '[0].a'));
  const v5 = {a: {b: 'b'}};
  expect(undefined).toBe(get(v5, 'a.c'));
});