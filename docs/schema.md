schema对应数据库中的表,普通列与数据库中字段一一对应,关联关系对应数据库中的外键.

# schema

```ts
orqlExecutor.addSchema(name, columns: Columns, options?);
```

添加用户和角色

```ts
import OrqlExecutor, {DataType, longPkAndGk, intPkAndGk} from 'orql-executor';

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

## schema options

* table 表名,默认为schema名

# column

column是一个包含数据类型和长度还有是否可以非空等选项的对象.

name列,类型为string,长度为16,不能为空,在数据库中field名为name

```ts
name: {type: DataType.String, length: 16, required: true, field: 'name'}
```

当然也可以是一个DataType.

name列,类型未string,其他选项为默认值.

```
name: DataType.String
```

也可以把常用的options封装成一个函数使用.

直接声明

```ts
id: {type: DataType.Long, primaryKey: true, generatedKey: true}
```

使用函数声明

```ts
id: longPkAndGk()
```

## column options

### field
数据库表中的字段名称,默认为column名

### type
数据类型
* string: DataType.String // 字符串
* int: DataType.Int // int
* float: DataType.Float // float
* long: DataType.Long // long
* date: DataType.Date // 日期
* enum: DataType.Enum // 枚举
* bool: DataType.Boolean // bool值

### length
字段长度，默认为空

### required
非空要求，默认为false。
### primaryKey
数据库主键

### generatedKey
自增键

### pkAndGk
自增主键

### defaultValue
默认值，如插入该字段但参数为空，则使用该值，值为js的字面量。

默认值为false

```ts
{isDelete: false}
```
默认值为当前时间

```ts
{createAt: 'new Date()'}
```

### initialValue
初始化值，如插入该字段，则自动覆盖参数值，值与defaultValue一致。

# 关联

关联关系与对象中的关联关系是一致的,在当前表中可以存储另外一张表的引用外键,将两张表通过外键关联起来,在查询出来的结果中将关联表映射到对象中.

数据库 `user表 -> roleId外键 -> role表`

对象 `user对象 -> role对象`

## belongsTo
belongsTo用于声明一个Schema中某个属性属于另外一个Schema,用于描述N:1的N方或1:1的属于方关系,如User Schema中的role属于一个Role(N:1),UserInfo中的user属于User(1:1)。refKey是该属性在当前Schema表中的外键,默认为属性名Id。

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
hasOne用于声明一个Schema中某个属性是另外一个Schema,用于描述1:1的拥有方关系,如User Schema中的info拥有一个UserInfo。refKey是该属性在ref Schema表中的外键,默认为当前schema名Id。

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
hasMany用于声明一个Schema中某个属性拥有多个另外一个Schema,用于描述1:N关系,如Role Schema的users拥有多个User。refKey是该属性在ref Schema表中的外键,默认为当前schema名Id。

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
belongsToMany用于声明一个Schema中某个属性拥有多个另外一个Schema.用于描述N:M关系,如一个Post拥有多个Tag,一个Tag也拥有多个Post.current -> middle -> ref,middle是N:M关系的中间schema.refKey为当前schema名Id,middleKey默认为ref schema名Id.

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

## association options

关联关系配置 association options

### refName
关联schema名

### type
关联类型AssociationType

* AssociationType.BelongsTo 
* AssociationType.HasOne 
* AssociationType.HasMany 
* AssociationType.BelongsToMany


### refKey
关联键会自动默认设置

### required
是否必须，默认为true

### middleName
多对多关联中间schema名,在多对多中必选

### middleKey
中间schema连接ref的关联键