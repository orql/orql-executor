orql-executor是orql(关系对象查询语言)的执行引擎,由typescript编写也支持javascript运行,支持以对象结构描述查询数据和筛选条件进行sql的查询。

# 安装

yarn

```
yarn add orql-executor
```
npm

```
npm install orql-executor --save
```

# 示例
```ts
import OrqlExecutor, {DataType, intPkAndGk} from 'orql-executor';
// js const {OrqlExecutor, DataType, intPkAndGk} from 'orql-executor';

const orqlExecutor = new OrqlExecutor({
  dialect: 'mysql' | 'sqlite3',
  connection: {
    host: 'localhost',
    // sqlite3 db路径
    path: path.resolve(__dirname, './test.db'),
    database: 'myorm',
    username: 'root'
  }
});

orqlExecutor.addSchema('user', {
  id: intPkAndGk(),
  name: DataType.String
});

const start = async () => {
  await orqlExecutor.sync('update');
  const session = await orqlExecutor.newSession();
  const id = await orqlExecutor.add('add user: {name}', {name: 'n0'});
  // 自增id
  console.log(id);
  await session.close();
}

start().catch(err => console.error(err));

```

## 方言
目前仅支持mysql和sqlite3,后续版本将会添加对更多数据库支持.

### mysql
安装mysql驱动依赖 `yarn add mysql`

### sqlite3
安装sqlite3驱动依赖 `yarn add sqlite3`

# 实例创建

在使用之前先创建实例,用于后续操作.

```ts
const orqlExecutor = new OrqlExecutor({
  dialect?: 'mysql' | 'sqlite3';
  connection?: {
    host?: string; // 数据库host,没有port使用默认port
    database?: string; // 数据库名
    username?: string; // 用户名
    password?: string; // 无密码不需要填写
    path?: string; // sqlite3数据库路径
  }
});
```

表结构同步

orqlExecutor.sync方法将当前的schema结构同步到数据库的表结构中,create直接创建,update修改表结构,delete先删除再创建.

```
await orqlExecutor.sync('create');
```

# schema
每一个schema对应数据库中的一张表,schema中的结构与数据库表的结构一致,在schema中可以配置数据库中不支持的对象关联关系并映射到对应的表外键字段上.schema声明请查看[schema使用文档](./schema.md).

# session
一个session表示当前数据库的一个活动,session中提供orql语句的执行和事务管理等功能.更多请查看[session使用文档](./session.md).