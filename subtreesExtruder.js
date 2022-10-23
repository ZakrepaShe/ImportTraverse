import { createHmac } from 'node:crypto';

function getHash(str) {
  return createHmac('sha256', str).digest('hex');
}

const subTreesMap = {};
const checked = {};

function copySubtrees(tree, subtree = false) {
  const hash = getHash(tree.name);
  if (checked[hash] && tree.children) {
    subTreesMap[hash] = tree;
  } else {
    checked[hash] = true;
  }
  if (tree.children) {
    tree.children.forEach((child) => {
      copySubtrees(child, subtree);
    });
  }
}


const exported = {};

function cleanSubtrees(tree, skipname = '') {
  const hash = getHash(tree.name);
  if (subTreesMap[hash] && hash !== getHash(skipname)) {
    exported[hash] = JSON.parse(JSON.stringify(subTreesMap[hash]));
    console.log('Exported', tree.name);
    tree.name = `${tree.name} E`;
    tree.children = null;
  } else {
    if (tree.children) {
      tree.children.forEach((child) => {
        cleanSubtrees(child);
      });
    }
  }
}

// some chunks are inside same subtrees and marked as subtree itself as 'subtreel1c2', but they dont
// must be excluded from exporting
export function cleanUnexportedChunks() {
  Object.keys(subTreesMap).forEach(key => {
    if(!exported[key]) {
      delete subTreesMap[key]
    }
  })
}

export function extrudeSubtrees(tree) {
  copySubtrees(tree);
  cleanSubtrees(tree);
  cleanUnexportedChunks()
  tree.subTrees = Object.values(exported).map(val => {
    cleanSubtrees(val, val.name);
    return val
  });
}

const sample = {
  name: 'root',
  children: [
    {
      name: 'l1c1',
      children: null,
    },
    {
      name: 'subtree2',
      children: [
        {
          name: 'subtree2l1c1',
          children: null,
        },
      ],
    },
    {
      name: 'l1c2',
      children: [
        {
          name: 'l2c1',
          children: [
            {
              name: 'subtree',
              children: [
                {
                  name: 'subtreel1c1',
                  children: null,
                },
                {
                  name: 'subtreel1c2',
                  children: [
                    {
                      name: 'subtreel2c1',
                      children: null,
                    },
                    {
                      name: 'subtree2',
                      children: [
                        {
                          name: 'subtree2l1c1',
                          children: null,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: 'l2c2',
          children: [
            {
              name: 'subtree',
              children: [
                {
                  name: 'subtreel1c1',
                  children: null,
                },
                {
                  name: 'subtreel1c2',
                  children: [
                    {
                      name: 'subtreel2c1',
                      children: null,
                    },
                    {
                      name: 'subtree2',
                      children: [
                        {
                          name: 'subtree2l1c1',
                          children: null,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// extrudeSubtrees(sample);
// console.log(JSON.stringify(sample, null, 2));
