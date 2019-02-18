orql-mapper
---

orql(Object Relational Query Language)是一种类json的关系型数据库数据查询dsl，使用类json语法描述树状的关系数据结构和查询条件以及排序等。orql-mapper使用orql作为查询dsl，编译orql为sql并映射查询结果到orql声明的结构中。相较于传统的curd开发，orql的特点是入门门槛极低、开发效率高、维护成本低。

# 快速开始

## 安装

```
yarn add orql-mapper

# database driver
yarn add mysql
yarn add sqlite
```

## 配置

```ts
import OrqlMapper from 'orql-mapper';
//js const {OrqlMapper} = require('orql-mapper');

const orqlMapper = new OrqlMapper({
  dialect: 'mysql',  // 目前支持mysql sqlite3
  connection: {
    host: 'localhost',
    database: 'db',
    username: 'username',
    password: 'password',
    path: path  // sqlite db path
  }
});
```

# schema

orql-mapper的schema对应到数据库中相应的表

```ts
/**
* add schema
* @param name  schema name
* @param columns columns data type or column options or association options
* @param options
*/
orqlMapper.addSchema(name, columns: Columns}, options);
```

```ts
import {DataType, longPkAndGk, intPkAndGk} from 'orql-mapper';
//js const {orqlMapper, DataType, LongPkAndGk, intPkAndGk} = require('orql-mapper');

orqlMapper.addSchema('user', {
  id: longPkAndGk(),
  name: DataType.String
});

orqlMapper.addSchema('role', {
  id: intPkAndGk(),
  name: DataType.String
}, {
  table: 'role'
});
```

data type

* string: DataType.String
* int: DataType.Int
* float: DataType.Float
* long: DataType.Long
* date: DataType.Date
* enum: DataType.Enum
* bool: DataType.Boolean

column options

* field: 数据库field,默认为name
* type: 数据类型
* length: 长度
* required: 非空,默认为false
* primaryKey: 主键
* generatedKey: 自增
* pkAndGk: 自增主键

association options

* refName: 关联schema名
* type: AssociationType
* refKey: 关联键会自动默认设置
* required: 是否必须
* middleName: 多对多关联中间schema名
* middleKey: 中间schema连接ref的关联键

AssociationType

* AssociationType.BelongsTo 
* AssociationType.HasOne 
* AssociationType.HasMany 
* AssociationType.BelongsToMany

辅助声明函数

```ts
intPkAndGk() // {type: DataType.Int, pkAndGk: true}
longPkAndGk() // {type: DataType.Long, pkAndGk: true}
belongsTo()
hasOne()
hasMany()
belongsToMany()
```

# 关联
## belongsTo
belongsTo用于声明一个Schema中某个属性属于另外一个Schema,用于描述N:1的N方或1:1的属于方关系,如User Schema中的role属于一个Role(N:1),UserInfo中的user属于User(1:1)。refKey是该属性在当前Schema表中的外键。

```ts
/**
* belongsTo
* @param refName  关联schema名
* @param options refKey default `${ref.name}Id`
*/
belongTo(refName: string options?: AssociationOptions);
```

orql: `user : {id, name, role : {id, name}}`

```ts
import {belongsTo} from 'orql-mapper';

orqlMapper.addSchema('user', {
  id: intPkAndGk(),
  name: DataType.String,
  role: belongsTo('role')
});
orqlMapper.addSchema('role', {
  id: intPkAndGk(),
  name: DataType.String
});
```

## hasOne
hasOne用于声明一个Schema中某个属性是另外一个Schema,用于描述1:1的拥有方关系,如User Schema中的info拥有一个UserInfo。refKey是该属性在ref Schema表中的外键。

```ts
/**
* hasOne
* @param refName  关联schema名
* @param options refKey default `${current.name}Id`
*/
hasOne(refName: string, options?: AssociationOptions)
```

orql: `user : {name, info : {id, avatar}}`

```ts
orqlMapper.addSchema('user', {
  id: intPkAndGk(),
  name: DataType.String,
  info: hasOne('userInfo')
});
orqlMapper.addSchema('userInfo', {
  id: intPkAndGk(),
  avatar: DataType.String,
  user: belongsTo('user')
});
```

## hasMany
hasMany用于声明一个Schema中某个属性拥有多个另外一个Schema,用于描述1:N关系,如Role Schema的users拥有多个User。refKey是该属性在ref Schema表中的外键。

```ts
/**
* hasMany
* @param refName  关联schema名
* @param options refKey default `${current.name}Id`
*/
hasMany(refName: string, options?: AssociationOptions)
```

orql: `role : {id, name, users: [id, name]}`

```ts
orqlMapper.addSchema('role', {
  id: intPkAndGk(),
  name: DataType.String,
  users: hasMany('user')
});
```

## belongsToMany
belongsToMany用于声明一个Schema中某个属性拥有多个另外一个Schema。用于描述N:M关系,如一个Post拥有多个Tag,一个Tag也拥有多个Post。current -> middle -> ref,middle是N:M关系的中间schema。

```ts
/**
* belongsToMany
* @param refName  关联schema名
* @param middleName 关联middle名
* @param options  refKey default `${current.name}Id`  middleKey default `${ref.name}Id`
*/
belongsToMany(refName: string, middleName: string, options?: AssociationOptions)
```

orql: `post : {id, title, tags: [id, name]}`

orql: `tag: {id, name, posts: [id, title]}`

```ts
orqlMapper.addSchema('post', {
  id: intPkAndGk(),
  title: DataType.String,
  tags: belongsToMany('tag', 'postTag')
});
orqlMapper.addSchema('tag', {
  id: intPkAndGk(),
  name: DataType.String,
  posts: belongsToMany('post', 'postTag')
});
orqlMapper.addSchema('postTag', {
  post: belongsTo('post'),
  tag: belongsTo('tag')
});
```

# orql
orql是一种用于关系查询的dsl，语法结构与json类似，并支持查询条件和排序等高级操作。{}表明为object类型，[]表明为array类型。

## query

* 简单查询

使用id查询用户并返回用户名

`query user(id = $id) : {name}`

查询全部用户返回用户名

`query user : [name]`

* exp

使用手机和密码或者邮箱和密码查询用户并返回用户id和用户名

`query user(phone = $phone && password = $password || email = $email && password = $password) : {id, name}`

exp支持比较column与column或者值或者参数和exp使用&&和||来进行比较。column必须是schema中声明的column，外键的column也可以用于比较。

外键查询

`query user(roleId = $roldId)`

* value

bool `false` `true`

null `null`

string `'string'` `"string"`

number `1` `0.1`

* orders

order by id asc
`query user(order id)`

order by id desc id name asc
`query user(order id desc, id name)`

* items

items是查询后返回的字段，只要在schema中已经声明的关系，就可以一直获取下去。用{}表示一个object，用[]表示一个array，查询返回的数据的结构与描述的结构是一致的。

获取用户的姓名、用户角色名、用户的文章标题和该文章的标签

`query user : {name, role : {name}, posts : [title, tags : [name]]}`

items中可以使用*来表示获取全部的字段，不包括关联属性，使用!来表示排除掉某字段

获取用户出密码外全部属性

`query user : {*, !password}`

## count

count操作用于获取数量，其它字段都不会返回。

查询全部用户数量

`count user`

查询帖子中有某个关键词的数量

`count post(title like $keyword)`

查询角色名为admin的用户数量

`count user : [role(name = 'admin')]`

## add

add用于插入数据，关联关系中只能插入belongsTo的关系。关联schema插入时使用其完整对象，不能只传入一个id。如主键设置为自增，插入后会返回主键。

```
// 插入用户姓名、手机和角色
// {name: 'name', phone: '123456', role : {id: 1}}
add user : {name, phone, role}
// 插入用户出id外其他属性
add user : {*, !id}
```

## update

update用于修改数据，同add关联关系中也只能修改belongsTo的关系。

```
// 修改特定id的用户名
update user(id = $id) : {name}
// 修改特定id的用户角色
update user(id = $id) : {role}
```

## delete

delete用于删除数据，因为安全问题，在delete的orql中必须有exp。

```
// 删除特定id的用户
delete user(id = $id)
```

# 使用
## session

创建session

`const session = await orqlMapper.newSession();`

查询

```ts
// query {} 返回object或undefined
// query [] 返回数组
// count 返回number
// params 参数列表键值对 {id: 1, name: 'name'}
// limit offset分页
const results = await session.query(orql, {params}, {limit, offset});
```

新增

`const id = await session.add(orql, {params});`

修改

`const row = await session.update(orql, {params});`

删除

`const row = await session.delete(orql, {params});`

native query

```
// sql select * from user where id = $id
// params {id: 1}
const results = await session.nativeQuery(sql, params);
// results是一个数组
// get index或者get key返回字段值
results[0].get(0);
results[0].get('name');
```

native update

`const row = await session.nativeUpdate(sql, params);`

query builder

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

update builder

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

## migration

自动建表 `orqlMapper.sync('create');`

删除后建表 `orqlMapper.sync('drop');`

自动更新 `orqlMapper.sync('update');`

# mapper
使用mapper对native sql查询的结果进行数据映射。

声明

```ts
import Mapper, {array, column, id, object} from '../src/mapper/MapperManager';

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

使用

```ts
session.nativeQuery(sql, params, mapper);
```

```ts
const users = await session.nativeQuery('select user.id as id, user.name as name, user.password as password, role.id as roleId, role.name as roleName from user inner join role', {}, userMapper) as User[];
```