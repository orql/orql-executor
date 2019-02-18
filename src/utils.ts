export function get(object: any, path: string) {
  const keys = path.replace('[', '.').replace(']', '').split('.');
  let tmp = object;
  for (const key of keys) {
    if (key == '') continue;
    tmp = tmp[key];
    if (tmp == undefined) return;
  }
  return tmp;
}