# i18n Tagged Template Literals - Schema Generator [![Build Status](https://img.shields.io/travis/skolmer/i18n-tag-schema/master.svg?style=flat)](https://travis-ci.org/skolmer/i18n-tag-schema) [![npm version](https://img.shields.io/npm/v/i18n-tag-schema.svg?style=flat)](https://www.npmjs.com/package/i18n-tag-schema)
[![NPM](https://nodei.co/npm/i18n-tag-schema.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/i18n-tag-schema/)

[![i18n Tagged Template Literals](images/vscode-18n-tag-schema-icon-big.jpg)](http://i18n-tag.kolmer.net/)

Generates a json schema for all [i18n tagged](https://github.com/skolmer/es2015-i18n-tag) template literals in your project


## Installation

```sh
$ npm install i18n-tag-schema --save-dev
```

## Usage
```js
import i18nTagSchema from 'i18n-tag-schema'

i18nTagSchema('./src', '\\.jsx?', './translation.schema.json', false, (output, type) => {
    // log(output)
})
```

### Gulp Task
```js
var gulp = require('gulp')
var i18nTagSchema = require('i18n-tag-schema').default
gulp.task('generate-translation-schema', function (cb) {
  i18nTagSchema('./src', '\\.jsx?', './translation.schema.json', false, (output, type) => {
      console.log(output)
      if(type === 'error' || type === 'success') cb(); // finished task
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
## Tools

### Run time translation and localization
* [es2015-i18n-tag](https://github.com/skolmer/es2015-i18n-tag): ES2015 template literal tag for i18n and l10n translation and localization using Intl

### Build time translation
* [babel-plugin-i18n-tag-translate](https://github.com/skolmer/babel-plugin-i18n-tag-translate): Translate your template literals at build time.

### Schema based translations
* [vscode-18n-tag-schema](https://github.com/skolmer/vscode-i18n-tag-schema): Visual Studio Code Extension to generate a JSON schema.
