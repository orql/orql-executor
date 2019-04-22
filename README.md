orql-executor
---

orql(Object Relational Query Language)是一种对象关系查询语言,使用键和树描述对象结构.orql-executor将orql生成sql,查询后映射成对象.

# 运行环境

node.js >= 8.0

使用typescript编写,也支持javascript直接运行

typescript >= 3.0

# 安装

```
yarn add orql-executor

// 安装对应数据库驱动
yarn add mysql
yarn add sqlite3
```

# orql示例

添加用户 `add user: {phone, password}`

用户登陆 `query user(phone = $phone && password = $password): {id, name}`

修改用户名 `update user(id = $id): {name}`

查询全部用户忽略密码 `query user: [*, !password]`

添加角色 `add role: {name}`

添加用户和用户角色 `add user: {phone, password, role}`

查询用户和角色 `query user: [*, role: {*}]`

# 特性

* orql执行
* async/await异步
* 多数据库支持(目前支持mysql和sqlite3)
* 1:1 1:N N:1 N:M关系
* 数据库事务
* 原生sql映射
* 表结构同步

# 文档
* [开始使用](./docs/index.md)
* [schema定义](./docs/schema.md)
* [orql语法](./docs/orql.md)
* [session](./docs/session.md)

# 相关项目
* [orql-baas](https://www.github.com/orql/orql-baas) 基于orql的可视化后端云

# 其他语言
* [java](https://www.github.com/orql/java-executor)