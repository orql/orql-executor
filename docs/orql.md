orql是Object Relational Query Language的缩写,是一种用于关系查询的dsl,结构与json类似,{}为object类型,[]为array类型。并支持查询条件和排序等高级操作。

op root(exp order) : [column, object(exp): {}, array(exp): []]

## query

### 简单查询

使用id查询用户并返回用户名

`query user(id = $id) : {name}`

查询全部用户返回用户名

`query user : [name]`

### exp

使用手机和密码或者邮箱和密码查询用户并返回用户id和用户名

`query user(phone = $phone && password = $password || email = $email && password = $password) : {id, name}`

exp支持比较column与column或者值或者参数和exp使用&&和||来进行比较。column必须是schema中声明的column，外键的column被插入到相关的schema中,也可以直接使用。

外键查询

`query user(roleId = $roldId)`

### value

bool `false` `true`

null `null`

string `'string'` `"string"`

number `1` `0.1`

### orders

order by id asc
`query user(order id)`

order by id desc id name asc
`query user(order id desc, id name)`

### items

查询后返回的字段,只要在schema中已经声明的关系,就可以一直获取下去.用{}表示一个object,用[]表示一个array.

获取用户的姓名、用户角色名、用户的文章标题和该文章的标签.

`query user : {name, role : {name}, posts : [title, tags : [name]]}`

items中可以使用*来表示获取全部的字段，不包括关联属性，使用!来表示排除掉某字段.

获取用户除密码外全部属性.

`query user : {*, !password}`

### object
object在orql中表示一个对象,在筛选数据时关联schema不一定需要返回值,即object(exp)后面没有带相关的items.

### array
array在orql中表示一个数组.

## count

count操作用于获取数量.

查询全部用户数量.

`count user`

查询帖子中有某个关键词的数量.

`count post(title like $keyword)`

查询角色名为admin的用户数量.

`count user : [role(name = 'admin')]`

## add

add用于插入数据,关联关系中只能插入belongsTo的关系.关联schema插入时使用其包含id的对象.如主键设置为自增,插入后会返回自增的主键值.

```
// 插入用户姓名、手机和角色
// {name: 'name', phone: '123456', role : {id: 1}}
add user : {name, phone, role}
// 插入用户出id外其他属性
add user : {*, !id}
```

## update

update用于修改数据,同add关联关系中也只能修改belongsTo的关系。

```
// 修改特定id的用户名
update user(id = $id) : {name}
// 修改特定id的用户角色
update user(id = $id) : {role}
```

## delete

delete用于删除数据,因为安全问题,在delete的orql中必须有exp,如果没有则报错.

```
// 删除特定id的用户
delete user(id = $id)
```