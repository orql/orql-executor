# 安装

yarn

```
yarn add orql-executor

// 安装以下驱动之一
yarn add mysql
yarn add sqlite3
```

# 开始使用

## 创建实例

使用configuration初始化orqlExecutor实例,实例用于管理数据库连接和项目实体等,提供添加schema,创建session等方法.

typescript

```ts
import OrqlExecutor from 'orql-executor';

const orqlExecutor = new OrqlExecutor(configuration);
```

javascript

```js
const {OrqlExecutor} = require('orql-executor');
```

## 配置

```
configuration = {
  connection: {
    ...
  },
  dialect: ...
};
```

### connection

数据库连接相关配置,包括数据库host,数据库用户名和密码等,数据库驱动根据连接配置去连接数据库.

* host  数据库host
* database  数据库
* username  用户名
* password  密码
* path  sqlite3数据库路径

### dialect

不同数据库对于sql语法要求有所出入,dialect用于声明不同类似的数据库的sql方言,框架根据dialect生成适配相应数据库的sql语句.在迁移到其他数据库的时候,系统自动完成sql到目标数据库的转换.

#### mysql
`dialect: 'mysql'`

#### sqlite3
`dialect: 'sqlite3'`


# schema
每一个schema对应数据库中的一张表,schema中的结构与数据库表的结构一致,数据库中外键对应schema中的关联对象.

## 添加schema
```ts
import {DataType, intPkAndGk} from 'orql-executor';

orqlExecutor.addSchema('user', {
  id: intPkAndGk(),
  name: DataType.String
});
```

schema声明请查看[schema使用文档](./schema.md).

## 表结构同步
schema中记录实体信息,对应到数据库相应的表中,如数据库未创建相应的表,使用orqlExecutor.sync方法将当前的schema结构同步到数据库的表结构中,create直接创建,update修改表结构,delete先删除再创建.

```
await orqlExecutor.sync('create');
```

# session
一个session表示当前数据库的一个活动对象,与数据库连接所关联,session中提供orql语句执行和事务管理等功能.对数据库进行操作均需要使用session对象,在使用session后确保使用close关闭session.

```ts
const session = await orqlExecutor.newSession();
const result = await session.query(orql, params);
```

更多请查看[session使用文档](./session.md).

# orql
orql是使用对象键和对象关联树来描述对象结构的dsl,框架根据其描述生成相应的sql语句,在执行后将查询结构映射回其描述的对象中.

```
add user : {name}
query user: {id, name}
```

更多使用请查看[orql使用文档](./orql.md).