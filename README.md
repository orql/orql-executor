orql-mapper
---

orql(Object Relational Query Language)是一种对象关系映射关系型数据库查询语言,使用类json语法描述树状的关系数据结构和查询条件以及排序等.orql的特点是入门门槛低,开发效率高,简单的查询语法使得orql语句的生成非常容易,通过生成语句可以进一步提升效率.

# 运行环境

node.js >= 8.0

使用typescript编写,也支持javascript直接运行

typescript >= 3.0

# 安装

```
yarn add orql-mapper

// 安装对应数据库驱动
yarn add mysql
yarn add sqlite3
```

# 特性

* orql执行
* 多数据库支持(目前支持mysql和sqlite3)
* 表结构同步
* 1:1 1:N N:1 N:M关系
* 数据库事务
* async/await异步
* 原生sql映射

# 文档
* [开始使用](./docs/index.md)
* [schema定义](./docs/schema.md)
* [orql语法](./docs/orql.md)
* [session](./docs/session.md)