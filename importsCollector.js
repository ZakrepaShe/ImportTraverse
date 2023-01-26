import parser from '@babel/core';
import traverse from '@babel/traverse';
import fs from 'fs';
import path from 'path';
import {
  cleanupChains,
  extrudeSubtrees,
  getCleanedChainsNumber,
} from './subtreesExtruder.js';
import { JsonStreamStringify } from 'json-stream-stringify';
import { flattenTree } from './flattenTree.js';
import archiver from 'archiver';
import { Readable } from 'stream';
import ee from 'streamee';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { filePath, Root } = require('./config.json');

import replace from 'replace-in-file';
const replaced = {};
const options = {
  files: Root + '/src/**',
  from: /const[^;]*import\((.*)\)\);/gm,
  to: (...args) => {
    const name = args.pop();
    const match = args[0].match(/const (\w+) [^;]*import\((.*)\)\);/m);

    const replacement = `import ${match[1]} from ${match[2]};`;

    if (!replaced[name]) {
      replaced[name] = [];
    }
    replaced[name].push({origin: args[0], replaced: replacement});

    return replacement;
  },
};
replace.sync(options);
console.log('Replaced lazy import()');


// const filePath = 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\exportable\\components.ts'; //too much memory, use flattenResult
// const filePath = 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\components\\Form\\controls\\InputAdapter\\InputWrapper.js'; // Recursive!
// const filePath = 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\utils\\validation\\conditionValidation.spec.ts'; // Enormous size!
// const filePath = 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\utils\\slateAddOnLogs.spec.js';
const modulesRoot = Root + '\\node_modules';

const relativeOnly = true;
const collectAbsoluteImports = true;
const resolveRecursion = true;
const logRecursion = false;
const extrudeReusedSubtrees = true;
const flattenResult = true;
const maxDeep = 20000;

const logFilePaths = false;

const filterPaths = [
  // 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\utils\\common\\common.js',
  // 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\utils\\CreateComponent\\index.js',
  // 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\constants\\prop-types.js',
  // 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\utils\\common\\get.js',
  // 'lodash-es',
];

const cachedNodes = {};
const absoluteImports = {};

function getAST(filePath) {
  const name = path.basename(filePath);
  const fileData = fs.readFileSync(filePath, 'utf-8');
  return parser.parseSync(fileData, {
    filename: name,
    sourceType: 'module',
    configFile: './.babelrc.cjs',
  });
}

function checkAllowedFiles(filePath) {
  return !filePath.match(/\.scss$/);
}

function indexFixer(pathToItem, debug = false) {
  try {
    debug && console.log('Try stat file', pathToItem);
    const stat = fs.statSync(pathToItem);

    if (stat.isFile()) {
      logFilePaths && console.log('filePath', pathToItem);
      return pathToItem;
    } else {
      throw new Error('Path not to file')
    }

  } catch (e) {
    try {
      const pathWithJs = pathToItem + '.js';

      const stat = fs.statSync(pathWithJs);

      if (stat.isFile()) {
        logFilePaths && console.log('filePath js', pathWithJs);

        return pathWithJs;
      }
    } catch (e) {
      try {
        const pathWithTs = pathToItem + '.ts';
        const stat = fs.statSync(pathWithTs);
        logFilePaths && console.log('filePath ts', pathWithTs);

        if (stat.isFile()) {
          return pathWithTs;
        }
      } catch (e) {
        try {
          const pathWithTsx = pathToItem + '.tsx';
          const stat = fs.statSync(pathWithTsx);
          logFilePaths && console.log('filePath tsx', pathWithTsx);

          if (stat.isFile()) {
            return pathWithTsx;
          }
        } catch (e) {
          try {
            debug && console.log('Try stat dir', pathToItem);
            const stat = fs.statSync(pathToItem);

            if (stat.isDirectory()) {
              try {
                const pathWithIndexJs = pathToItem + '\\index.js';

                debug && console.log('Try index.js', pathWithIndexJs);
                fs.statSync(pathWithIndexJs);
                logFilePaths && console.log('filePath IndexJs', pathWithIndexJs);

                return pathWithIndexJs;
              } catch (e) {
                try {
                  const pathWithIndexTS = pathToItem + '\\index.ts';

                  debug && console.log('Try index.ts', pathWithIndexTS);
                  fs.statSync(pathWithIndexTS);
                  logFilePaths && console.log('filePath IndexTS', pathWithIndexTS);

                  return pathWithIndexTS;
                } catch (e) {
                  try {
                    const pathWithIndexTSX = pathToItem + '\\index.tsx';

                    debug && console.log('Try index.tsx', pathWithIndexTSX);
                    fs.statSync(pathWithIndexTSX);
                    logFilePaths && console.log('filePath IndexTS', pathWithIndexTSX);

                    return pathWithIndexTSX;
                  } catch (e) {
                    return '';
                  }
                }
              }
            }
          } catch (e) {
            return '';
          }
        }
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

        if (!checkAllowedFiles(path.node.source.value)) return;

        if (path.node.source.value[0] === '.') {
          result = callback(path.node.source.value, 'relative');
        } else {
          if (!relativeOnly) {
            if (indexFixer(modulesRoot + '\\' + path.node.source.value)) {
              result = callback(path.node.source.value, 'moduleFile');
            } else {
              result = callback(path.node.source.value, 'module');
            }
          }
          if (collectAbsoluteImports) {
            const rootLibName = path.node.source.value.split('/src')[0];
            absoluteImports[`${rootLibName}`] = true;
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
  if (chain.length > maxDeep) {
    const outPath = outputPathFormatter(filePath);
    console.log(`${outPath} D`);
    return {
      name: `${outPath} D`,
      chain,
    };
  }

  const checkedPath = indexFixer(filePath);
  if (!checkedPath) {
    const outPath = outputPathFormatter(filePath);
    const fromParent = outputPathFormatter(chain[chain.length - 1]);
    console.log(`Cant resolve ${outPath} from ${fromParent}`);
    return {
      name: `${outPath} N`,
      chain,
    };
  }

  if (resolveRecursion && chain.some((pathInChain) => pathInChain === filePath)) {
    const outPath = outputPathFormatter(filePath);
    logRecursion && console.log('filePath ' + outPath + ' Recursion!');
    return {
      name: `${outPath} R`,
      chain,
    };
  }

  if (filterPaths.some((filteredPath) => checkedPath.includes(filteredPath))) {
    console.log('filePath ' + outputPathFormatter(filePath) + ' Short');
    return {
      name: outputPathFormatter(filePath) + ' S',
      chain,
    };
  }

  const ast = getAST(checkedPath);

  const children = traverseFile(ast, (importPath, importType) => {
      const absolutePath = importType === 'relative'
        ? path.resolve(path.dirname(checkedPath), importPath)
        : importType === 'module'
          ? processNodeModule(path.resolve(modulesRoot, importPath))
          : path.resolve(modulesRoot, importPath);

      if (!cachedNodes[absolutePath]) {
        cachedNodes[absolutePath] = processFile(absolutePath, [...chain, filePath]);
      }
      return cachedNodes[absolutePath];
    },
  );

  return {
    name: outputPathFormatter(filePath),
    chain,
    ...children.length > 0 && {children},
  };
}


let tree = processFile(filePath);

if (!collectAbsoluteImports) {
  if (extrudeReusedSubtrees) {
    extrudeSubtrees(tree);
  }

  cleanupChains(tree);
  getCleanedChainsNumber();

  if (flattenResult) {
    tree = flattenTree(tree);
  }


// Stream to file
  fs.writeFileSync('tree.js', 'export default ', 'utf-8');
  const writeStream = fs.createWriteStream('tree.js', {flags: 'a+'});
  const stringifyStream = new JsonStreamStringify(tree, null, 2, false);

  stringifyStream.pipe(writeStream);

// Stream to ZIP
// const output = fs.createWriteStream('example.zip');
// const readableStream = Readable.from('export default ');
// const stringifyStream = new JsonStreamStringify(tree, null, 2, false);
// const archive = archiver('zip', {
//   zlib: { level: 6 } // Sets the compression level.
// });
//
// const stream1AndThenStream2 = ee.concatenate([readableStream, stringifyStream]);
//
// archive.pipe(output);
// archive.append(stream1AndThenStream2, { name: 'tree.js' });
// archive.finalize();
} else {
  fs.writeFileSync('libs.js', 'export default ' + JSON.stringify(Object.keys(absoluteImports).sort((a, b) => a.localeCompare(b)), null, 2), 'utf-8');
}

Object.keys(replaced).forEach(filePath => {
  const options = {
    files: filePath,
    from: replaced[filePath].map(({replaced}) => new RegExp(replaced, 'g')),
    to: replaced[filePath].map(({origin}) => origin),
  };
  replace.sync(options);
})
console.log('Restore lazy import()');
