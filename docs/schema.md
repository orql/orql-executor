orql-executor的schema对应到数据库中相应的表

# 添加schema

函数原型

```ts
/**
* add schema
* @param name  schema name
* @param columns columns data type or column options or association options
* @param options
*/
orqlExecutor.addSchema(name, columns: Columns}, options);
```

例子

```ts
import OrqlExecutor, {DataType, longPkAndGk, intPkAndGk} from 'orql-executor';
//js const {OrqlExecutor DataType, LongPkAndGk, intPkAndGk} = require('orql-executor');

orqlExecutor.addSchema('user', {
  id: longPkAndGk(),
  name: DataType.String
});

orqlExecutor.addSchema('role', {
  id: intPkAndGk(),
  name: DataType.String
}, {
  table: 'role'
});
```

数据类型 data type

* string: DataType.String // 字符串
* int: DataType.Int // int
* float: DataType.Float // float
* long: DataType.Long // long
* date: DataType.Date // 日期
* enum: DataType.Enum // 枚举
* bool: DataType.Boolean // bool值

类可选选型 column options

* field: 数据库field,默认为name
* type: 数据类型
* length: 长度
* required: 非空,默认为false
* primaryKey: 主键
* generatedKey: 自增
* pkAndGk: 自增主键

关联关系配置 association options

* refName: 关联schema名
* type: AssociationType
* refKey: 关联键会自动默认设置
* required: 是否必须
* middleName: 多对多关联中间schema名,在多对多种必选
* middleKey: 中间schema连接ref的关联键

关联类型AssociationType

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

关联关系与对象中的关联关系是一致的,在当前表中可以存储另外一张表的引用外键,将两张表通过外键关联起来,在查询出来的结果中将关联关系映射到对象中.

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
import {belongsTo} from 'orql-executor';

orqlExecutor.addSchema('user', {
  id: intPkAndGk(),
  name: DataType.String,
  role: belongsTo('role')
});
orqlExecutor.addSchema('role', {
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
orqlExecutor.addSchema('user', {
  id: intPkAndGk(),
  name: DataType.String,
  info: hasOne('userInfo')
});
orqlExecutor.addSchema('userInfo', {
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
orqlExecutor.addSchema('role', {
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
orqlExecutor.addSchema('post', {
  id: intPkAndGk(),
  title: DataType.String,
  tags: belongsToMany('tag', 'postTag')
});
orqlExecutor.addSchema('tag', {
  id: intPkAndGk(),
  name: DataType.String,
  posts: belongsToMany('post', 'postTag')
});
orqlExecutor.addSchema('postTag', {
  post: belongsTo('post'),
  tag: belongsTo('tag')
});
```