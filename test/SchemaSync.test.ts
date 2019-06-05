import orqlExecutor from './orqlExecutor';

test('test create', async () => {
  await orqlExecutor.sync('create');
});

test('test drop', async () => {
  await orqlExecutor.sync('drop');
});

test('test update', async () => {
  await orqlExecutor.sync('update');
});