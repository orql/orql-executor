# session

## 创建session

```ts
const session = await orqlExecutor.newSession();
```

## orql操作

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

查询返回结果为数组,在数组的子对象中,使用get访问属性,可以使用数字索引或者名称索引.

### native update

```ts
const row = await session.nativeUpdate(sql, params);
```

执行后返回影响的条数.

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

## native build

```ts
session.buildNative()
  .sql(sql)  // sql
  .param(key, value)  // 参数，在sql中为#name
  .params({[key: string]: any})  // 所有参数
  .queryAll()  //查询全部
  .queryOne()  //查询单条
  .update()  //修改
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

mapper对象为一个数组,object array必须声明id,用于筛选特定的数据.

## id()
当前实体在sql查询中的主键,默认name为id,也可使用{name: 'name'}来声明.field默认也为id,可使用{field: 'field'}声明.

## mapper column
mapper column可以是当前键的名称`name`或者`column('name')`,默认键名与sql列名一样,column对应需要映射对象的属性,如field与属性名称不一致则使用`column('name', {field: 'field'});`来声明.

## mapper object
mapper object对应映射对象的关联对象,如`user -> role`需要用object来声明role.

```ts
object(name, children);
```

## mapper array
mapper array对应映射对象的关联数组,如`user -> posts`需要用array类声明posts.



## mapper使用

native查询使用mapper

```ts
session.buildNative.(sql).mapper(mapper);
```

user mapper

```ts
const userMapper = Mapper.create([
  id(),
  'name',
  'password',
  object('id', [
    id({field: 'roleId'}),
    column('name', {field: 'roleName'})
  ])
]);
```

获取user和其关联role

```ts
const users = await session.buildNative()
  .sql('select user.id as id, user.name as name, user.password as password, role.id as roleId, role.name as roleName from user inner join role')
  .mapper(userMapper)
  .queryAll() as User[];
```