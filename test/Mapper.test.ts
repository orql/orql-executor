import orqlExecutor from './orqlExecutor';
import Mapper, {array, column, id, object} from '../src/mapper/Mapper';
import {Role, User} from './schemas';
import Session from '../src/Session';

const userMapper = Mapper.create([
  id(),
  'name',
  column('password'),
  object('role', [
    id({field: 'roleId'}),
    column('name', {field: 'roleName'})
  ]),
  array('posts', [
    id({field: 'postId'}),
    column('title')
  ])
]);

async function exec(callback: (session: Session) => void) {
  const session = await orqlExecutor.newSession();
  await session.beginTransaction();
  await callback(session);
  await session.rollback();
  await session.close();
}

test('test query mapper', async () => {
  await exec(async session => {
    const role: Role = {name: 'r1'};
    await session.buildUpdate().add('role', role);
    await session.buildUpdate().add('user', {name: 'n1', role: {id: role.id}});
    const users = await session.buildNative()
      .sql('select user.id as id, user.name as name, user.password as password, role.id as roleId, role.name as roleName from user inner join role')
      .mapper(userMapper)
      .queryAll() as User[];
    expect(users[0].name).toBe('n1');
    expect(users[0].role!.name).toBe('r1');
  });
});