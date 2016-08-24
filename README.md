# i18n Tagged Template Literals - Schema Generator [![Build Status](https://img.shields.io/travis/skolmer/i18n-tag-schema/master.svg?style=flat)](https://travis-ci.org/skolmer/i18n-tag-schema) [![npm version](https://img.shields.io/npm/v/i18n-tag-schema.svg?style=flat)](https://www.npmjs.com/package/i18n-tag-schema)
[![NPM](https://nodei.co/npm/i18n-tag-schema.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/i18n-tag-schema/)

[![i18n Tagged Template Literals](images/vscode-18n-tag-schema-icon-big.jpg)](http://i18n-tag.kolmer.net/)

## Overview

This node module generates a [JSON Schema](http://json-schema.org/) of all [i18n tagged](https://github.com/skolmer/es2015-i18n-tag) template literals in a JavaScript project.
A JSON schema can add key validation and autocompletion to your JSON based translation files (See [IDE Integration](#ide-integration)).
The tool will only detect template literals that are tagged with i18n (See [es2015-i18n-tag](http://i18n-tag.kolmer.net/)).
It has support for [Custom Translation Groups](https://github.com/skolmer/es2015-i18n-tag#appjs) and generated [File Module Groups](https://github.com/skolmer/es2015-i18n-tag#babel-generated-file-module-groups). `__translationGroup` constants in your code will be resolved relative to [`path`](http://github.kolmer.net/i18n-tag-schema/globals.html#default).

The following repository provides examples for use with npm scripts or gulp: https://github.com/skolmer/i18n-tag-examples

i18n-tag-schema can also be used to export translation keys into a simple json format (See [Additional Features](#additional-features)). This can be useful if you want to import your translation keys into a 3rd party tool. (Other export formats might be added later. Pull requests are welcome!)

This module does include a JSON validator that helps you keep track of missing or invalid keys in your translation files and shows you the current translation coverage of your project. A translation file is considered valid if it covers 100% of the translation keys defined in the JSON schema. This feature can be integrated into an automated build pipeline to check the translation coverage of a build. It can also be used to write unit tests that fail if your modules are not fully translated.

## Installation

```sh
$ npm install i18n-tag-schema --save-dev
```

## Usage
```js
import i18nTagSchema from 'i18n-tag-schema'

i18nTagSchema('./src', '\\.jsx?$', './translation.schema.json', (output, type) => {
    // log(output)
})
```

[See docs](http://github.kolmer.net/i18n-tag-schema/globals.html#default)

### Via npm

#### package.json
```json
{
  "scripts": {
    "generate-schema": "i18n-tag-schema ./src",
    "validate-german-translation": "i18n-tag-schema ./translations/translation.de.json --validate --schema ./translation.schema.json",
    "validate-translations": "i18n-tag-schema ./translations --validate --schema ./translation.schema.json"
  }
}
```
```sh
$ npm run generate-schema
$ npm run validate-german-translation
$ npm run validate-translations
```

### Via Gulp
```js
var gulp = require('gulp')
var i18nTagSchema = require('i18n-tag-schema').default
var validateSchema = require('i18n-tag-schema').validateSchema
gulp.task('generate-translation-schema', function (cb) {
  i18nTagSchema('./src', '\\.jsx?$', './translation.schema.json', (output, type) => {
      console.log(output)
      if(type === 'error' || type === 'success') cb(); // finished task
  })
})

gulp.task('validate-german-translation', function (cb) {
  validateSchema('./translations/translation.de.json', './translation.schema.json', (output, type) => {
      console.log(output)
      if(type === 'error' || type === 'success') cb(); // finished task
  })
})

gulp.task('validate-translations', function (cb) {
  validateSchema('./translations', './translation.schema.json', (output, type) => {
      console.log(output)
      if(type === 'error' || type === 'success') cb(); // finished task
  })
})
```

### Via Command-line

Install i18n-tag-schema as global package to use it as command-line tool

```sh
$ npm install i18n-tag-schema -g
```

```
Usage: i18n-tag-schema <path> [options]

Options:

    -h, --help            output usage information
    -V, --version         output the version number
    -s, --schema <path>   set schema path. defaults to ./translation.schema.json
    -f, --filter <regex>  a regular expression to filter source files. defaults to \.jsx?$
    -v, --validate        use to validate translation file(s). path has to be a JSON file or directory. requires --schema <path>
    -e, --export <path>   export all translation keys FROM a JavaScript file or directory.
    -t, --target <path>   export all translation keys TO a JSON file. requires --export <path>.
                          If --target is not set, JSON will be printed to the output.
```

### Reference schema in translation.json file
```json
{
    "$schema": "./translation.schema.json",
    "key": "value"
}
```

## Validation Rules

The generated Schema checks
* if your translation file is missing some of your project's translation keys.
* if a translation key or group is unknown.
* if a translation value contains all parameters defined in the translation key (e.g. ${0}, ${1}).

Some IDEs can also provide auto completion for translation keys and groups

## IDE Integration

### Webstorm / PhpStorm

Webstorm and PhpStorm support JSON Schemas since version 2016.1. For more details please see:  [Add JSON Schema Mapping Dialog](https://www.jetbrains.com/help/webstorm/2016.1/add-json-schema-mapping-dialog.html)

### Visual Studio Code

For Visual Studio Code you can install the i18n-tag-schema extension from [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=skolmer.vscode-i18n-tag-schema)

## Additional Features

### Export translation keys

Read all i18n tagged template literals from a JavaScript file or directory

```js
import { exportTranslationKeys } from 'i18n-tag-schema'

exportTranslationKeys('./samples', '.',
    (message, type) => {
        const cons = console[type]
        if(cons) {
            cons(message)
        } else {
            console.log(message)
        }        
    },
    (templates) => {
        /**
        * templates: [
        *     '\n        <user name="${0}">${1}</user>\n    ',
        *     '\n    <users>\n    ${0}\n    </users>\n'
        * ]
        */ 
    }
)
```

[See docs](http://github.kolmer.net/i18n-tag-schema/globals.html#exporttranslationkeys)

### Validate translation file

The validation function checks
* if your translation files are missing some of your project's translation keys.
* if a translation key or group is unknown.
* if a translation value contains all parameters defined in the translation key (e.g. ${0}, ${1}).

```js
import { validateSchema } from 'i18n-tag-schema'

validateSchema('./translations', './translation.schema.json', (output, type) => {
    const cons = console[type]
    if(cons) {
        cons(message)
    } else {
            console.log(message)
    } 
    if(type === 'error' || type === 'success') {
        // isValid(type === 'success')
    }
})
```

[See docs](http://github.kolmer.net/i18n-tag-schema/globals.html#validateschema)

## Tools

### Run time translation and localization
* [es2015-i18n-tag](https://github.com/skolmer/es2015-i18n-tag): ES2015 template literal tag for i18n and l10n (translation and internationalization) using Intl [![npm version](https://img.shields.io/npm/v/es2015-i18n-tag.svg?style=flat)](https://www.npmjs.com/package/es2015-i18n-tag)

### Build time translation
* [babel-plugin-i18n-tag-translate](https://github.com/skolmer/babel-plugin-i18n-tag-translate): Translate your template literals at build time or add filename groups [![npm version](https://img.shields.io/npm/v/babel-plugin-i18n-tag-translate.svg?style=flat)](https://www.npmjs.com/package/babel-plugin-i18n-tag-translate)

### Schema based translations
* [vscode-18n-tag-schema](https://github.com/skolmer/vscode-i18n-tag-schema): Visual Studio Code Extension for JSON Schema based translation validation and tools [![Marketplace Version](https://vsmarketplacebadge.apphb.com/version-short/skolmer.vscode-i18n-tag-schema.svg)](https://marketplace.visualstudio.com/items?itemName=skolmer.vscode-i18n-tag-schema)

## License

Copyright (c) 2016 Steffen Kolmer

This software is licensed under the MIT license.  See the `LICENSE` file
accompanying this software for terms of use.
