import parser from '@babel/core';
import traverse from '@babel/traverse';
import fs  from 'fs';
import path from 'path';
import { extrudeSubtrees } from './subtreesExtruder.js';

//const filePath = 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\exportable\\components.ts'; //too much memory
const filePath = 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\components\\Form\\controls\\InputAdapter\\InputWrapper.js'; // Recursive!
// const filePath = 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\utils\\slateAddOnLogs.spec.js';
const Root = 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app';
const modulesRoot = Root + '\\node_modules';

const relativeOnly = true;
const resolveRecursion = true;
const extrudeReusedSubtrees = true;

const filterPaths = [
  'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\utils\\common\\common.js',
  'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\utils\\CreateComponent\\index.js',
  'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\constants\\prop-types.js',
  'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\utils\\common\\get.js',
  'lodash-es',
];

const cachedNodes = {};

function getAST(filePath) {
  const name = path.basename(filePath);
  const fileData = fs.readFileSync(filePath, 'utf-8');
  return parser.parseSync(fileData, {
    filename: name,
    sourceType: 'module',
    configFile: './.babelrc.cjs',
  });
}

function indexFixer(pathToItem) {
  try {
    const stat = fs.statSync(pathToItem);

    if (stat.isFile()) {
      console.log('filePath', pathToItem);
      return pathToItem;
    } else if (stat.isDirectory()) {
      try {
        const pathWithIndexJs = pathToItem + '\\index.js';

        fs.statSync(pathWithIndexJs);
        console.log('filePath IndexJs', pathWithIndexJs);

        return pathWithIndexJs;
      } catch (e) {
        try {
          const pathWithIndexTS = pathToItem + '\\index.ts';

          fs.statSync(pathWithIndexTS);
          console.log('filePath IndexTS', pathWithIndexTS);

          return pathWithIndexTS;
        } catch (e) {
          const pathWithIndexTSX = pathToItem + '\\index.tsx';
          try {
            fs.statSync(pathWithIndexTSX);
            console.log('filePath IndexTS', pathWithIndexTSX);

            return pathWithIndexTSX;
          } catch (e) {
            return '';
          }
        }
      }
    }
  } catch (e) {
    try {
      const pathWithJs = pathToItem + '.js';

      const stat = fs.statSync(pathWithJs);

      if (stat.isFile()) {
        console.log('filePath js', pathWithJs);

        return pathWithJs;
      }
    } catch (e) {
      try {
        const pathWithTs = pathToItem + '.ts';
        const stat = fs.statSync(pathWithTs);
        console.log('filePath ts', pathWithTs);

        if (stat.isFile()) {
          return pathWithTs;
        }
      } catch (e) {
        return '';
      }
    }
  }
}

function outputPathFormatter(filePath) {
  return filePath.replace(Root, '').replace('\\node_modules\\', '');
}


function traverseFile(ast, callback) {
  const imports = [];
  traverse.default(ast, {
    enter(path) {
      if (path.isImportDeclaration()) {
        let result = '';
        if (path.node.source.value[0] === '.') {
          result = callback(path.node.source.value, 'relative');
        } else if (!relativeOnly) {
          if (indexFixer(modulesRoot + '\\' + path.node.source.value)) {
            result = callback(path.node.source.value, 'moduleFile');
          } else {
            result = callback(path.node.source.value, 'module');
          }
        }
        if (result) imports.push(result);
      }
    },
  });
  return imports;
}

function processNodeModule(modulePath) {
  const packagePath = modulePath + '\\package.json';
  const stat = fs.statSync(packagePath);
  if (stat.isFile()) {
    const packageData = fs.readFileSync(packagePath, 'utf-8');
    const parsedPackage = JSON.parse(packageData);
    return path.resolve(modulePath, parsedPackage.module || parsedPackage.main);
  }
}


function processFile(filePath, chain = []) {
  const checkedPath = indexFixer(filePath);
  if (!checkedPath) return {
    name: `No file at ${filePath}`,
    chain,
  };

  if (resolveRecursion && chain.some((pathInChain) => pathInChain === filePath)) {
    return {
      name: outputPathFormatter(filePath) + ' Recursion! ',
      chain,
    };
  }

  if (filterPaths.some((filteredPath) => checkedPath.includes(filteredPath))) {
    return {
      name: outputPathFormatter(filePath) + ' Short ',
      chain,
    };
  }

  const ast = getAST(checkedPath);

  const children = traverseFile(ast, (importPath, importType) => {
      if (!cachedNodes[importPath]) {
        cachedNodes[importPath] = processFile(
          importType === 'relative'
            ? path.resolve(path.dirname(checkedPath), importPath)
            : importType === 'module'
            ? processNodeModule(path.resolve(modulesRoot, importPath))
            : path.resolve(modulesRoot, importPath),
          [...chain, filePath]
        );
      }
      return cachedNodes[importPath];
    },
  );

  return {
    name: outputPathFormatter(filePath),
    chain,
    ...children.length > 0 && {children},
  };
}


const tree = processFile(filePath);

if(extrudeReusedSubtrees) {
  extrudeSubtrees(tree)
}

fs.writeFileSync('tree.js', 'export default ' + JSON.stringify(tree, null, 2), 'utf-8');


