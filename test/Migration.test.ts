import orqlMapper from './orqlMapper';

test('test create', async () => {
  await orqlMapper.sync('create');
});

test('test drop', async () => {
  await orqlMapper.sync('drop');
});

test('test update', async () => {
  await orqlMapper.sync('update');
});