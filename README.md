# i18n-tag-schema
![](images/vscode-18n-tag-schema-icon-big.jpg)

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

### Reference schema in translation.json file
```json
{
    "$schema": "./translation.schema.json",
    "key": "value"
}
```
