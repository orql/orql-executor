import path from 'path';
import OrqlExecutor, {belongsTo, belongsToMany, DataType, hasMany, hasOne, intPkAndGk} from '../src';

const orqlExecutor = new OrqlExecutor({
  // dialect: 'sqlite3',
  dialect: 'mysql',
  connection: {
    host: 'localhost',
    path: path.resolve(__dirname, './test.db'),
    database: 'myorm',
    username: 'root'
  }
});
orqlExecutor.addSchema('user', {
  id: intPkAndGk(),
  name: DataType.String,
  password: DataType.String,
  deleted: {
    type: DataType.Boolean,
    initialValue: 'false'
  },
  createAt: {
    type: DataType.Date,
    defaultValue: 'new Date()'
  },
  role: belongsTo('role'),
  posts: hasMany('post', {refKey: 'authorId'}),
  info: hasOne('userInfo')
});
orqlExecutor.addSchema('role', {
  id: intPkAndGk(),
  name: DataType.String
});
orqlExecutor.addSchema('userInfo', {
  id: intPkAndGk(),
  avatar: DataType.String,
  user: belongsTo('user')
});
orqlExecutor.addSchema('post', {
  id: intPkAndGk(),
  title: DataType.String,
  content: DataType.String,
  author: belongsTo('user'),
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

export default orqlExecutor;