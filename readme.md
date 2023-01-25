#Imports tree analyzer 
Collect used npm packages across all app using babel traverse like webpack.

Before running, install this package deps with `yarn install`, tune options in `config.json`

###Options `config.json`
`filePath` - absolute file path to app entrypoint file

Execute `node importsCollector.js`, as result `libs.js` will be created in this app root folder
