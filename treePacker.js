import { incrementalHash } from './hash.js';

const packed = {
  hashedTree: {},
  hashedSubTrees: [],
  branches: {}
};

export function packTree(tree, current = packed.hashedTree) {
  const hashName = incrementalHash(tree.name);
  current[hashName] = {};
  packed.branches[hashName] = tree.name;
  if (tree.children) {
    tree.children.forEach((child) => {
      packTree(child, current[hashName]);
    });
  }
  if (tree.subTrees) {
    tree.subTrees.forEach((child, index) => {
      packed.hashedSubTrees.push({})
      packTree(child, packed.hashedSubTrees[index]);
    });
  }
  return packed;
}

const unpacked = {};
let branches = null;


function unpackBranch([numberName, value], current= unpacked) {
  current.name = branches[numberName];
  const children = Object.entries(value);
  if(children) {
    current.children = [];
    children.forEach(([childNumberName, childValue], index) => {
      current.children[index] = {};
      unpackBranch([childNumberName, childValue], current.children[index]);
    })
  }
}


export function unpackTree(tree) {
  if (tree.hashedTree) {
    branches = tree.branches;
    Object.entries(tree.hashedTree).forEach(([numberName, value])=>{
      unpackBranch([numberName, value]);
    })
  }

  if (tree.hashedSubTrees.length) {
    unpacked.subTrees = [];
    tree.hashedSubTrees.forEach((subTree, index) => {
      unpacked.subTrees.push({});
      unpackBranch(Object.entries(subTree)[0], unpacked.subTrees[index]);
    })
  }

  return unpacked;
}
