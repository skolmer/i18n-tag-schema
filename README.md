# i18n Tagged Template Literals - Schema Generator [![Build Status](https://img.shields.io/travis/skolmer/i18n-tag-schema/master.svg?style=flat)](https://travis-ci.org/skolmer/i18n-tag-schema) [![npm version](https://img.shields.io/npm/v/i18n-tag-schema.svg?style=flat)](https://www.npmjs.com/package/i18n-tag-schema)
[![NPM](https://nodei.co/npm/i18n-tag-schema.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/i18n-tag-schema/)

[![i18n Tagged Template Literals](images/vscode-18n-tag-schema-icon-big.jpg)](http://i18n-tag.kolmer.net/)

## Overview

This node module generates a [JSON Schema](http://json-schema.org/) of all [i18n tagged](https://github.com/skolmer/es2015-i18n-tag) template literals in a JavaScript project.
A JSON schema can add key validation and autocompletion to your JSON based translation files (See [IDE Integration](#ide-integration)).
The tool will only detect template literals that are tagged with i18n (See [es2015-i18n-tag](http://i18n-tag.kolmer.net/)).
It has support for [Custom Translation Groups](https://github.com/skolmer/es2015-i18n-tag#appjs) and generated [File Module Groups](https://github.com/skolmer/es2015-i18n-tag#babel-generated-file-module-groups). If you want to use generated File Module Groups you have to set `groups` to `true`.

The following repository provides examples for use with npm scripts or gulp: https://github.com/skolmer/i18n-tag-examples

i18n-tag-schema can also be used to export translation keys into a simple json format (See [Additional Features](#additional-features)). This can be useful if you want to import your translation keys into a 3rd party tool. (Other export formats might be added later. Feature requests are welcome!)

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

[See docs](http://github.kolmer.net/i18n-tag-schema/globals.html#default)

### Via npm

#### package.json
```json
{
  "scripts": {
    "schema": "i18n-tag-schema ./src"
  }
}
```
```sh
$ npm run schema
```

### Via Gulp
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
    -f, --filter <regex>  a regular expression to filter source files. defaults to \.jsx?
    -g, --groups          group translations by module filenames
```

### Reference schema in translation.json file
```json
{
    "$schema": "./translation.schema.json",
    "key": "value"
}
```

## IDE Integration

### Webstorm / PhpStorm

Webstorm and PhpStorm support JSON Schemas since version 2016.1. For more details please see:  [Add JSON Schema Mapping Dialog](https://www.jetbrains.com/help/webstorm/2016.1/add-json-schema-mapping-dialog.html)

### Visual Studio Code

For Visual Studio Code you can install the i18n-tag-schema extension from [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=skolmer.vscode-i18n-tag-schema)

## Additional Features

Read all i18n tagged template literals from a JavaScript file

```js
import { templatesFromFile } from 'i18n-tag-schema'

const srcPath = path.resolve(__dirname, './samples')
const filePath = path.resolve(__dirname, './samples/multiline.js')

templatesFromFile(srcPath, filePath, false,
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

[See docs](http://github.kolmer.net/i18n-tag-schema/globals.html#templatesfromfile)

## Tools

### Run time translation and localization
* [es2015-i18n-tag](https://github.com/skolmer/es2015-i18n-tag): ES2015 template literal tag for i18n and l10n (translation and internationalization) using Intl

### Build time translation
* [babel-plugin-i18n-tag-translate](https://github.com/skolmer/babel-plugin-i18n-tag-translate): Translate your template literals at build time

### Schema based translations
* [vscode-18n-tag-schema](https://github.com/skolmer/vscode-i18n-tag-schema): Visual Studio Code Extension to generate a JSON schema
