export const hash = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0);
const map = {};
let inc = 0
export const incrementalHash = (s) => {
  if (!map[s]) {
    inc++
    map[s] = inc;
  }
  return map[s];
}
