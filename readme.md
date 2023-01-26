#Imports tree analyzer

Collect used npm packages across all app using babel traverse like webpack.

Before running, install this package deps with `yarn install`, tune options in `config.json`

###Options in `config.json`

`filePath` - absolute file path to app entrypoint file

`Root` - absolute file path to app directory

Execute `node importsCollector.js`, as result `libs.js` will be created in this app root folder
