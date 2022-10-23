#Imports tree analyzer & visualizer
Tree visualization starts from `index.html` with WebStorm internal static server

Data sample for `creator-addons-app\src\shared\components\Form\controls\InputAdapter\InputWrapper.js` included for demo vizualization

To make new sample use `importsCollector.js`.

Before creating first sample, install deps with `yarn install && node importsCollector.js`

###Legend to `importsCollector.js`
`filePath` - absolute file path to target file

`filterPaths` - absolute file paths, used to skip analyzer deeper search and have shorter tree


`Root` - absolute path to app root

`relativeOnly` - includes only relative imports (no node_modules packages)
