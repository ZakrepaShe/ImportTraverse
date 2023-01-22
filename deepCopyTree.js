function copyArray(arr) {
  return arr.map((value) => {
    const type = Object.prototype.toString.call(value);
    return type === "[object Object]"
      ? copyTree(value)
      : type === "[object Array]"
        ? copyArray(value)
        : value;
  }, {});
}


export function copyTree(treeNode) {
  return Object.entries(treeNode).reduce((acc, [key, value]) => {
    const type = Object.prototype.toString.call(value);

    acc[key] =
      type === "[object Object]"
        ? copyTree(value)
        : type === "[object Array]"
        ? copyArray(value)
        : value;
    return acc;
  }, {});
}
