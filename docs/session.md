# 创建session

```ts
const session = await orqlExecutor.newSession();
```

## orql

### 查询

```ts
// query {} 返回object或undefined
// query [] 返回数组
// count 返回number
// params 参数列表键值对 {id: 1, name: 'name'}
// limit offset分页
const results = await session.query(orql, {params}, {limit, offset});
```

### 新增

```ts
const id = await session.add(orql, {params});
```

### 修改

```
const row = await session.update(orql, {params});
```

### 删除

```
const row = await session.delete(orql, {params});
```

## native sql

### native query

```
// sql select * from user where id = $id
// params {id: 1}
const results = await session.nativeQuery(sql, params);
// results是一个数组
// get index或者get key返回字段值
results[0].get(0);
results[0].get('name');
```

### native update

```ts
const row = await session.nativeUpdate(sql, params);
```

## orql builder

orql builder用于快速构建一条orql语句,不必进行重复的编写,如插入或者修改操作根据需操作的对象键值自动生成语句.

### query builder

```ts
const user = await session.buildQuery()
  .orql('query user(id = $id): {*, !password}')
  .param('id', 1)
  .queryOne<User>();
  
const posts = await session.buildQuery()
  .orql('query posts(authorId = $userId) : [*]')
  .offset(0)  //  .page(1)
  .limit(10)  // .size(10)
  .queryAll<Post>();
  
const count = await session.buildQuery()
  .orql('count user')
  .count();
```

### update builder

```
// add
const user = {name: 'n1'}
await session.buildUpdate().add('user', user);
console.log(user.id);  //console user id

// update
user.name = 'n2';
await session.buildUpdate().update('user', user);
console.log(user.name); //console n2

// delete
session.buildUpdate().delete('user', user);
```

# mapper
可以使用mapper对复杂native sql查询的结果进行数据映射.

# 声明mapper

```ts
import Mapper, {array, column, id, object} from 'orqlExecutor/lib/mapper/MapperManager';

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
```

# mapper使用

```ts
session.nativeQuery(sql, params, mapper);
```

```ts
const users = await session.nativeQuery('select user.id as id, user.name as name, user.password as password, role.id as roleId, role.name as roleName from user inner join role', {}, userMapper) as User[];
```