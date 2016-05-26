# i18n-tag-schema
[![](images/vscode-18n-tag-schema-icon-big.jpg)](https://github.com/skolmer/es2015-i18n-tag)

Generates a json schema for all i18n tagged template literals in your project


## Installation

```sh
$ npm install i18n-tag-schema --save-dev
```

## Usage
```js
import i18nTagSchema from 'i18n-tag-schema'

i18nTagSchema('./src', '\\.jsx?', './translation.schema.json', (output) => {
    // log(output)
})
```

### Gulp Task
```js
var gulp = require('gulp')
var i18nTagSchema = require('i18n-tag-schema').default
gulp.task('generate-translation-schema', function (cb) {
  i18nTagSchema('./src', '\\.jsx?', './translation.schema.json', (output) => {
      console.log(output)
      cb(); // finished task
  })
})
```

### Reference schema in translation.json file
```json
{
    "$schema": "./translation.schema.json",
    "key": "value"
}
```
