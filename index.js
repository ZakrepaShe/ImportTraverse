const parser = require('@babel/core');
const traverse = require('@babel/traverse');
const fs = require('fs');
const path = require('path');

//const filePath = 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\exportable\\components.ts'; //too much memory
const filePath = 'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\components\\Form\\controls\\InputAdapter\\InputWrapper.js';

const filterPaths = [
  'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\utils\\common\\common.js',
  'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\utils\\CreateComponent\\index.js',
  'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\constants\\prop-types.js',
  'D:\\Work\\Airslate-Platform\\front-platform\\packages\\creator-addons-app\\src\\shared\\utils\\common\\get.js'
]

const cachedNodes = {};

function getAST(filePath) {
  const name = path.basename(filePath);
  const fileData = fs.readFileSync(filePath, 'utf-8');
  return parser.parseSync(fileData, {
    filename: name,
    sourceType: 'module',
    configFile: './.babelrc.js',
  });
}

function indexFixer(pathToItem) {
  try {
    const stat = fs.statSync(pathToItem);
    console.log('filePath', pathToItem)

    if (stat.isFile()) {
      return pathToItem;
    } else if (stat.isDirectory()) {
      const pathWithIndexJs =  pathToItem + '\\index.js';

      fs.statSync(pathWithIndexJs)
      console.log('filePath IndexJs',pathToItem)

      return pathWithIndexJs;
    }
  } catch (e) {
    try {
      const pathWithJs = pathToItem + '.js'

      const stat = fs.statSync(pathWithJs);
      console.log('filePath js',pathWithJs)

      if (stat.isFile()) {
        return pathWithJs;
      }
    } catch (e) {
      try {
        const pathWithTs = pathToItem + '.ts'
        const stat = fs.statSync(pathWithTs);
        console.log('filePath ts', pathWithTs)

        if (stat.isFile()) {
          return pathWithTs;
        }
      } catch (e) {
        return '';
      }
    }
  }

}


function traverseFile(ast, callback) {
  const imports = [];
  traverse.default(ast, {
    enter(path) {
      if (path.isImportDeclaration()) {
        if (path.node.source.value[0] === '.') {
          const result = callback(path.node.source.value);
          if (result) imports.push(result);
        }
      }
    },
  });
  return imports;
}


function processFile(filePath) {
  console.log(filePath);
  const checkedPath = indexFixer(filePath);
  if (!checkedPath) return {
    name: `No file at ${filePath}`,
  };

  if (filterPaths.includes(checkedPath)) {
    return {
      name: path.basename(filePath) + ' Short',
    }
  }

  const ast = getAST(checkedPath);

  const children = traverseFile(ast, (relativeImport) => {
      if(!cachedNodes[relativeImport]) {
        cachedNodes[relativeImport] = processFile(path.resolve(path.dirname(checkedPath), relativeImport))
      }
      return cachedNodes[relativeImport];
    },
  );

  return {
    name: path.basename(filePath),
    ...children.length > 0 && {children},
  };
}


const tree = processFile(filePath);
fs.writeFileSync('tree.js', 'export default ' + JSON.stringify(tree), 'utf-8');


