import { createHmac } from 'node:crypto';

function getHash(str) {
  return createHmac('sha256', str).digest('hex');
}

const subTreesMap = {};
const checked = {};

function copySubtrees(tree) {
  const hash = getHash(tree.name);
  if (checked[hash] && !subTreesMap[hash] && tree.children) {
    subTreesMap[hash] = tree;
  } else {
    checked[hash] = true;
  }
  if (tree.children) {
    tree.children.forEach((child) => {
      copySubtrees(child);
    });
  }
}


const exported = {};

function cleanSubtrees(tree, skipname = '', contextObj, contextIndex) {
  const hash = getHash(tree.name);
  if (subTreesMap[hash] && hash !== getHash(skipname)) {
    exported[hash] = subTreesMap[hash];
    if(contextObj) {
      contextObj[contextIndex] = {
        name: `${tree.name} E`,
      }
    } else {
      tree.name = `${tree.name} E`;
      delete tree.children;
    }
    // console.log('Exported', tree.name);
  } else {
    if (tree.children) {
      tree.children.forEach((child, index) => {
        cleanSubtrees(child, '', tree.children, index);
      });
    }
  }
}

// some chunks are inside same subtrees and marked as subtree itself as 'subtreel1c2', but they dont
// must be excluded from exporting
export function cleanUnexportedChunks() {
  Object.keys(checked).forEach(key => {
    if(!exported[key]) {
      delete checked[key];
      if(subTreesMap[key]) {
        delete subTreesMap[key];
      }
    }
  })
}

export function extrudeSubtrees(tree) {
  copySubtrees(tree);
  cleanSubtrees(tree);
  cleanUnexportedChunks();
  tree.subTrees = [];

  for (let i = 0; i < Object.values(exported).length; i++) {
    const val = Object.values(exported)[i]
    copySubtrees(val);
    cleanSubtrees(val, val.name);
    cleanUnexportedChunks();
    tree.subTrees.push(val)
  }
}

let chains = 0
export function cleanupChains(tree) {
  chains++
  delete tree.chain
  if (tree.children) {
    tree.children.forEach((child) => {
      cleanupChains(child);
    });
  }
  if (tree.subTrees) {
    tree.subTrees.forEach((child) => {
      cleanupChains(child);
    });
  }
}

export function getCleanedChainsNumber() {
  console.log(`Cleaned chains: ${chains}`)
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
