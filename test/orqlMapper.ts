import path from 'path';
import OrqlMapper, {belongsTo, belongsToMany, DataType, hasMany, hasOne, intPkAndGk} from '../src';

const orqlMapper = new OrqlMapper({
  // dialect: 'sqlite3',
  dialect: 'mysql',
  connection: {
    host: 'localhost',
    path: path.resolve(__dirname, './test.db'),
    database: 'myorm',
    username: 'root'
  }
});
orqlMapper.addSchema('user', {
  id: intPkAndGk(),
  name: DataType.String,
  password: DataType.String,
  role: belongsTo('role'),
  posts: hasMany('post', {refKey: 'authorId'}),
  info: hasOne('userInfo')
});
orqlMapper.addSchema('role', {
  id: intPkAndGk(),
  name: DataType.String
});
orqlMapper.addSchema('userInfo', {
  id: intPkAndGk(),
  avatar: DataType.String,
  user: belongsTo('user')
});
orqlMapper.addSchema('post', {
  id: intPkAndGk(),
  title: DataType.String,
  content: DataType.String,
  author: belongsTo('user'),
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

export default orqlMapper;