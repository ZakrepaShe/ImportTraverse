import { incrementalHash } from './hash.js';

const flatten = {
  hashedTree: {},
  subTrees: [],
  branches: {}
};

export function flattenTree(tree) {
  const hashName = incrementalHash(tree.name);
  flatten.branches[hashName] = tree.name;
  if (tree.children) {
    flatten.hashedTree[hashName] = [];
    tree.children.forEach((child) => {
      const childHashName = incrementalHash(child.name);
      flatten.hashedTree[hashName].push(childHashName);
      flattenTree(child);
    });
  }
  if(tree.subTrees) {
    tree.subTrees.forEach((subTree) => {
      const childHashName = incrementalHash(subTree.name);
      flatten.subTrees.push(childHashName);
      flattenTree(subTree);
    });
  }
  return flatten;
}

const reflattenedTree = {};

function reflattenBrunch(tree, current = reflattenedTree, hash = 1, subtree = false) {
  current.name = tree.branches[hash];
  if(tree.hashedTree[hash]) {
    current.children = [];
    tree.hashedTree[hash].forEach((childHash, index) => {
      current.children.push({});
      reflattenBrunch(tree, current.children[index], childHash, subtree);
    });
  }
}


export function reflattenTree(tree) {
  reflattenBrunch(tree);
  if(tree.subTrees) {
    reflattenedTree.subTrees = [];
    tree.subTrees.forEach((subTreeHash, index) => {
      reflattenedTree.subTrees[index] = {};
      reflattenBrunch(tree, reflattenedTree.subTrees[index], subTreeHash, true);
    });
  }

  return reflattenedTree;
}


