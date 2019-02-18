import {Post, PostTag, Role, Tag, User, UserInfo} from './schemas';
import Session from '../src/Session';
import orqlMapper from './orqlMapper';

beforeAll(async () => {
  await orqlMapper.sync('drop');
});

async function exec(callback: (session: Session) => void) {
  const session = await orqlMapper.newSession();
  await session.beginTransaction();
  await callback(session);
  await session.rollback();
  await session.close();
}

test('test add user and query by id', async () => {
  await exec(async session => {
    const user: User = {name: 'u1', password: 'p1'};
    await session.buildUpdate().add('user', user);
    const result = await session.buildQuery()
      .orql('query user(id = $id) : {*}')
      .param('id', user.id)
      .queryOne<User>();
    expect(user.id).toBeDefined();
    expect(result!.id).toBe(user.id);
  });
});

test('test add belongsTo and query belongsTo', async () => {
  await exec(async session => {
    const role: Role = {name: 'r1'};
    const user: User = {name: 'n1', password: 'p1'};
    await session.buildUpdate().add('role', role);
    user.role = role;
    await session.buildUpdate().add('user', user);
    const result = await session.buildQuery()
      .orql('query user(id = $id) : {*, role: {*}}')
      .param('id', user.id)
      .queryOne<User>();
    expect(result!.role!.id).toBe(role.id);
  });
});

test('test query by exp and', async () => {
  await exec(async session => {
    const user: User = {name: 'u1', password: 'p1'};
    await session.buildUpdate().add('user', user);
    const result = await session.buildQuery()
      .orql('query user(name = $name && password = $password) : {*}')
      .param('name', user.name)
      .param('password', user.password)
      .queryOne<User>();
    expect(result!.id).toBe(user.id);
  });
});

test('test query hasMany', async () => {
  await exec(async session => {
    const user: User = {name: 'n1'};
    await session.buildUpdate().add('user', user);
    const count = 5;
    for (let i = 0; i < count; i ++) {
      const post: Post = {title: `t${i}`, author: user};
      await session.buildUpdate().add('post', post);
    }
    const result = await session.buildQuery()
      .orql('query user(id = $id) : {*, posts: [*]}')
      .param('id', user.id)
      .queryOne<User>();
    expect(result!.posts!.length).toBe(count);
  });
});

test('test query hasOne', async () => {
  await exec(async session => {
    const user: User = {name: 'n1'};
    await session.buildUpdate().add('user', user);
    const info: UserInfo = {avatar: 'a1', user};
    await session.buildUpdate().add('userInfo', info);
    const result = await session.buildQuery()
      .orql('query userInfo(id = $id) : {*, user : {*}}')
      .param('id', info.id)
      .queryOne<UserInfo>();
    expect(result!.user!.id).toBe(user.id);
  });
});

test('test add and query belongsToMany', async () => {
  await exec(async session => {
    const count = 2;
    const posts: Post[] = [];
    const tags: Tag[] = [];
    for (let i = 0; i < count; i ++) {
      const post: Post = {title: `p${i}`};
      const tag: Tag = {name: `t${i}`};
      await session.buildUpdate().add('post', post);
      await session.buildUpdate().add('tag', tag);
      posts.push(post);
      tags.push(tag);
    }
    for (const post of posts) {
      for (const tag of tags) {
        const postTag: PostTag = {post, tag};
        await session.buildUpdate().add('postTag', postTag);
      }
    }
    for (const post of posts) {
      const result = await session.buildQuery()
        .orql('query post(id = $id) : {*, tags : [*]}')
        .param('id', post.id)
        .queryOne<Post>();
      expect(result!.tags!.length).toBe(count);
    }
  });
});

test('test delete', async () => {
  await exec(async session => {
    const user: User = {name: 'n1'};
    await session.buildUpdate().add('user', user);
    await session.buildUpdate().delete('user', user);
    const result = await session.buildQuery()
      .orql('query user(id = $id) : {*}')
      .param('id', user.id)
      .queryOne();
    expect(result).toBeUndefined();
  });
});

test('test update', async () => {
  await exec(async session => {
    const user: User = {name: 'n1'};
    await session.buildUpdate().add('user', user);
    user.name = 'n2';
    await session.buildUpdate().update('user', user);
    const result = await session.buildQuery()
      .orql('query user(id = $id) : {*}')
      .param('id', user.id)
      .queryOne<User>();
    expect(result!.name).toBe('n2');
  });
});

test('test count', async () => {
  await exec(async session => {
    const count = 10;
    for (let i = 0; i < count; i ++) {
      const user: User = {name: `n${i}`};
      await session.buildUpdate().add('user', user);
    }
    const result = await session.buildQuery().orql('count user').count();
    expect(result).toBe(count);
  });
});

test('test order', async () => {
  await exec(async session => {
    const count = 5;
    for (let i = 0; i < count; i ++) {
      const user: User = {name: `n${i}`};
      await session.buildUpdate().add('user', user);
    }
    const result = await session.buildQuery()
      .orql('query user(order id desc) : {*}')
      .queryOne<User>();
    expect(result!.name).toBe(`n${count - 1}`);
  });
});

test('test page', async () => {
  await exec(async session => {
    const count = 10;
    for (let i = 0; i < count; i ++) {
      const user: User = {name: `n${i}`};
      await session.buildUpdate().add('user', user);
    }
    const result = await session.buildQuery()
      .orql('query user : [*]')
      .limit(5)
      .offset(0)
      .queryAll<User>();
    expect(result.length).toBe(count / 2);
  });
});

test('test nest page', async () => {
  await exec(async session => {
    const count = 3;
    const postCount = 5;
    for (let i = 0; i < count; i ++) {
      const user: User = {name: `n${i}`};
      await session.buildUpdate().add('user', user);
      for (let j = 0; j < postCount; j ++) {
        const post: Post = {title: `p${j}`, author: user};
        await session.buildUpdate().add('post', post);
      }
    }
    const result = await session.buildQuery()
      .orql('query user : [posts: [*]]')
      .limit(count)
      .offset(0)
      .queryAll<User>();
    expect(result.length).toBe(count);
    result.forEach(
      user => expect(user.posts!.length).toBe(postCount));
  });
});

test('test like', async () => {
  await exec(async session => {
    const user: User = {name: 'n1'};
    await session.buildUpdate().add('user', user);
    const result = await session.buildQuery()
      .orql('query user(name like $key) : {*}')
      .param('key', 'n%')
      .queryOne<User>();
    expect(result!.name).toBe(user.name);
  });
});

test('test eq null', async () => {
  await exec(async session => {
    const user: User = {name: 'n1'};
    await session.buildUpdate().add('user', user);
    const result = await session.buildQuery()
      .orql('query user(password = null) : {*}')
      .queryOne<User>();
    expect(result!.name).toBe('n1');
  });
});

test('test not eq', async () => {
  await exec(async session => {
    const user: User = {name: 'n1'};
    await session.buildUpdate().add('user', user);
    const result = await session.buildQuery()
      .orql(`query user(name != 'n1') : {*}`)
      .queryOne<User>();
    expect(result).toBeUndefined();
  });
});

test('test not eq null', async () => {
  await exec(async session => {
    const user: User = {name: 'n1'};
    await session.buildUpdate().add('user', user);
    const result = await session.buildQuery()
      .orql(`query user(name != null) : {*}`)
      .queryOne<User>();
    expect(result!.name).toBe('n1');
  });
});

test('test nest exp', async () => {
  await exec(async session => {
    const user: User = {name: 'n1'};
    await session.buildUpdate().add('user', user);
    const result = await session.buildQuery()
      .orql(`query user((id = $id)) : {*}`)
      .param('id', user.id)
      .queryOne<User>();
    expect(result!.name).toBe('n1');
  });
});