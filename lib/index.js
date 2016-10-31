import * as fs from 'fs'
import * as path from 'path'
import escapeStringRegexp from 'escape-string-regexp'
import * as babylon from 'babylon'
import traverse from 'babel-traverse'
import Ajv from 'ajv'

const schemaProperty = '$schema'
const templateMap = {}

const babylonConfig = {
  sourceType: 'module',
  plugins: [
    'jsx',
    'asyncFunctions',
    'flow',
    'classConstructorCall',
    'doExpressions',
    'trailingFunctionCommas',
    'objectRestSpread',
    'decorators',
    'classProperties',
    'exportExtensions',
    'exponentiationOperator',
    'asyncGenerators',
    'functionBind',
    'functionSent'
  ]
}

function pushIfNotExist(array, item) {
  if (array.indexOf(item) === -1) {
    array.push(item)
  }
}

function sortByKey(array, key) {
  return array.sort(function (a, b) {
    const x = a[key] || a, y = b[key] || b
    return ((x < y) ? -1 : ((x > y) ? 1 : 0))
  })
}

function log(callback, text, type) {
  if (callback) {
    callback(text, type)
  } else {
    if (console.group) console.group('i18n-tag-schema')
    const log = console[type] || console.log
    log(text)
    if (console.groupEnd) console.groupEnd()
  }
}

function addTemplateProp(obj, tmpl) {
  obj[tmpl] = {
    type: 'string',
    minLength: 1,
    pattern: (templateMap[tmpl])?templateMap[tmpl]:undefined
  }
}

function addTemplateGroup(obj, tmpl) {
  const props = {}
  tmpl.items.forEach((t) => addTemplateProp(props, t))
  obj[tmpl.group] = {
    type: 'object',
    properties: props,
    required: tmpl.items
  }
}

function generateSchema(templates) {
  const props = {
    [schemaProperty]: {
      type: 'string'
    }
  }
  templates.forEach((tmpl) => (tmpl.group) ? addTemplateGroup(props, tmpl) : addTemplateProp(props, tmpl))
  return {
    type: 'object',
    properties: props,
    required: templates.map((t) => (t.group) ? t.group : t),
    additionalProperties: false
  }
}

function saveSchema(srcPath, filter, templates, schema, callback) {
  if (templates && templates.length) {   
    const newSchema = generateSchema(templates)
    const schemaString = JSON.stringify(newSchema, null, '\t')
    
    if (schema) {
      let prevJson
      if (fs.existsSync(schema)) {
        try {
          prevJson = fs.readFileSync(schema, 'utf-8')
        } catch (err) {
          log(callback, err.message, 'warn')
          log(callback, err, 'trace')
        }
      }
      fs.writeFile(schema, schemaString, 'utf-8', function (err) {
        if (err) {
          log(callback, err.message, 'error')
          log(callback, err, 'trace')
          return
        }

        const diff = jsonDiff(prevJson, newSchema, callback)
        log(callback, `i18n json schema has been updated; contains ${diff.count} keys  ( ${diff.added.length} added / ${diff.removed.length} removed ): ${schema}`, 'success')
      })
    } else {
      log(callback, schemaString, 'success')
    }
  } else {
    if (schema) {
      fs.writeFile(schema, JSON.stringify({}, null, '\t'), 'utf-8', function (err) {
        if (err) {
          log(callback, err.message, 'error')
          log(callback, err, 'trace')
          return
        }
        log(callback, `No i18n tagged template literals found in '${srcPath}'`, 'success')
      })
    } else {
      log(callback, JSON.stringify({}, null, '\t'), 'success')
    }
  }
}

function jsonDiff(oldJson, newObj, callback) {
  if (oldJson) {
    try {
      const buildStats = () => {
        oldKeys = oldKeys.filter((name) => name !== schemaProperty)
        newKeys = newKeys.filter((name) => name !== schemaProperty)
        const count = newKeys.length
        const removed = oldKeys.filter((value) => newKeys.indexOf(value) === -1)
        const added = newKeys.filter((value) => oldKeys.indexOf(value) === -1)
        return { removed, added, count }
      }
      const lookupKeys = (obj) => {
        let keys = []
        if (obj.properties) {
          keys = Object.keys(obj.properties).map((key) => {
            const prop = obj.properties[key]
            if (prop.properties) {
              return Object.keys(prop.properties)
            } else {
              return [key]
            }
          }).reduce(function (a, b) {
            return a.concat(b)
          }, [])
        }
        return keys
      }
      const oldObj = JSON.parse(oldJson)
      let oldKeys = lookupKeys(oldObj)
      let newKeys = lookupKeys(newObj)
      return buildStats()
    } catch (err) {
      log(callback, err.message, 'warn')
      log(callback, err, 'trace')
    }
  }
  let newKeys = Object.keys(newObj.properties || newObj.definitions.translations.properties || {})
  newKeys = newKeys.filter((name) => name !== schemaProperty)
  return { removed: [], added: newKeys, count: newKeys.length }
}

const traverseTemplateExpressions = {
  TaggedTemplateExpression: (path, { source, templates, groupName }) => {
    const node = path.node
    if (node.scanned) return
    node.scanned = true
    if (node.tag.name === 'i18n' || (node.tag.callee && (node.tag.callee.name === 'i18n' || (node.tag.callee.property && node.tag.callee.property.name === 'i18n'))) || (node.tag.property && node.tag.property.name === 'i18n')) {
      if (node.tag.arguments && node.tag.arguments.length) {
        groupName = node.tag.arguments[0].value || node.tag.arguments[0].name
      }
      let match = source.substring(node.quasi.start + 1, node.quasi.end - 1)
      let count = 0
      node.quasi.expressions.forEach((exp) => {
        const expression = source.substring(exp.start, exp.end)
        const expExpression = escapeStringRegexp(expression).replace(/\r/gm, '\\r').replace(/\n/gm, '\\n').replace(/\t/gm, '\\t').replace(/\s/gm, '\\s').replace(/"/gm, '\\"')
        const regExp = new RegExp(`\\\${\\s*${expExpression}\\s*}(:([a-z])(\\((.+)\\))?)?`, 'gm')
        match = match.replace(regExp, `\${${count}}`)
        count++
      })
      let template = match.replace(/\r\n/g, '\n')
      if (count) {
        let regex = ''
        for (let i = 0; i < count; i++) {
          regex += `(?=.*?\\\$\\\{${i}\\\})`
        }
        templateMap[template] = regex
      }
      if (groupName && !node.tag.name) {
        template = { group: groupName, value: template }
      }
      if (templates.indexOf(template) === -1 && templates.findIndex((t) => t.group && t.group === template.group && t.value && t.value === template.value) === -1) templates.push(template)
    }
  }
}

const traverseClassDeclarations = {
  ClassDeclaration: (path, { source, templates, groups }) => {
    const node = path.node
    if (node.decorators && node.decorators.length) {
      const groupNames = node.decorators.map((d) => d.expression).filter((e) => e.callee && e.callee.name === 'i18nGroup' && e.arguments && e.arguments.length).map((d) => d.arguments.map((a) => a.name || a.value)).reduce((p, n) => p.concat(n), [])
      const groupName = (groupNames.length) ? groupNames[0] : null
      path.traverse(traverseTemplateExpressions, { source, templates, groupName })
    } else {
      path.traverse(traverseTemplateExpressions, { source, templates, groupName: groups[node.id.name] })
    }
  }
}

const traverseExportDeclarations = {
  CallExpression: (path, { groups }) => {
    const node = path.node
    if (node.callee &&
      node.callee.type === 'CallExpression' &&
      node.callee.callee &&
      node.callee.callee.type === 'Identifier' &&
      node.callee.callee.name === 'i18nGroup' &&
      node.callee.arguments &&
      node.callee.arguments.length &&
      node.arguments &&
      node.arguments.length) {
      groups[node.arguments[0].name] = node.callee.arguments[0].name || node.callee.arguments[0].value
    }
  }
}


function inspectFile(contents) {
  const templateRegEx = /i18n(?:\(.*?\))?\s*`[^`]*`/g
  const matches = templateRegEx.exec(contents)
  const templates = []
  const groups = []
  if (matches && matches.length) {
    const ev = (source) => {
      const ast = babylon.parse(source, babylonConfig)
      traverse(ast, {
        Program: (path) => {
          path.traverse(traverseExportDeclarations, { source, templates, groups }) // find all i18nGroup calls
          path.traverse(traverseClassDeclarations, { source, templates, groups }) // traverse classes first to get group decorators
          path.traverse(traverseTemplateExpressions, { source, templates }) // traverse all template expressions
        }
      })
    }
    ev(contents)
  }
  return templates
}

function readFile(rootPath, filePath, templates, contents, callback) {
  try {
    const newTemplates = inspectFile(contents)
    const { length } = newTemplates

    if (length) {
      const fileGroup = path.relative(rootPath, filePath).replace(/\\/g, '/')
      const groupedItems = { [fileGroup]: [] }
      const getOrCreateGroup = (name) => groupedItems[name] || (groupedItems[name] = [])
      const ungroupedTemplate = []
      newTemplates.forEach((t) => {
        if (t.group) {
          pushIfNotExist(getOrCreateGroup((t.group === '__translationGroup') ? fileGroup : t.group), t.value)
        } else {
          pushIfNotExist(ungroupedTemplate, t)
        }
      })
      ungroupedTemplate.forEach((item) => {
        pushIfNotExist(templates, item)
      })
      Object.keys(groupedItems).sort().forEach((g) => {
        const groupItems = groupedItems[g]
        if (groupItems && groupItems.length) {
          const grp = templates.find((item) => item.group === g)
          if (grp) {
            groupItems.forEach((item) => {
              pushIfNotExist(grp.items, item)
            })
            grp.items.sort()
          } else {
            templates.push({ group: g, items: groupItems.sort() })
          }
        }
      })
      templates.sort()
      log(callback, `${path.relative(rootPath, filePath)} (${length} template${(length === 1) ? '' : 's'})`, 'info')
    } else {
      log(callback, `${path.relative(rootPath, filePath)} (0 templates)`, 'info')
    }
  } catch (err) {
    log(callback, `${filePath}: ${err.message}`, 'warn')
    log(callback, `${filePath}: ${err}`, 'trace')
  }
}

function countKeys(schema) {
  const groups = {}
  let count = 0
  if (schema.properties) {
    const keys = Object.keys(schema.properties)
    keys.forEach((key) => {
      const prop = schema.properties[key]
      if (prop.properties) {
        const keyCount = Object.keys(prop.properties).length
        groups[key] = keyCount
        count += keyCount
      } else {
        if (key !== '$schema') {
          count++
        }
      }
    })
  }
  return { count, groups }
}

function _validateSchema(filePath, schemaPath, callback) {
  const relativePath = path.basename(filePath)
  try {
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        log(callback, err, 'error')
        return
      }
      const dataObject = JSON.parse(data)
      fs.readFile(schemaPath, 'utf-8', (err, schema) => {
        if (err) {
          log(callback, err, 'error')
          return
        }
        const schemaObject = JSON.parse(schema)
        const ajv = new Ajv({ allErrors: true, v5: true })
        const validate = ajv.compile(schemaObject)
        const valid = validate(dataObject)
        if (!valid) {
          let missingKeys = 0
          let unknownKeys = 0
          const totalKeys = countKeys(schemaObject)
          validate.errors.forEach((error) => {
            let message = ''
            const isGroup = (!error.dataPath && typeof totalKeys.groups[error.params.missingProperty] !== 'undefined')
            switch (error.keyword) {
              case 'required':
                if (isGroup) {
                  missingKeys += totalKeys.groups[error.params.missingProperty]
                } else {
                  missingKeys++
                }
                message = `${relativePath} is missing translation ${(isGroup) ? 'group' : 'key'} ${JSON.stringify(error.params.missingProperty)}${(error.dataPath) ? ` in ${error.dataPath}` : ''}`
                break
              case 'minLength':
                missingKeys++
                message = `${relativePath} is missing translation ${error.dataPath}`
                break
              case 'pattern':
                message = `${relativePath} translation of ${error.dataPath} does not include all parameters`
                break
              case 'additionalProperties':
                unknownKeys++
                message = `${relativePath} has unknown translation key or group ${JSON.stringify(error.params.additionalProperty)}${(error.dataPath) ? ` in ${error.dataPath}` : ''}`
                break
              default:
                message = `${relativePath} ${JSON.stringify(error)}`
                break
            }
            log(callback, message, 'warn')
          })
          const coverage = (totalKeys.count) ? Math.round(((totalKeys.count - missingKeys) / totalKeys.count) * 100) : 0
          const pluralize = (val) => (val === 1) ? '' : 's'
          log(callback, `${relativePath} has ${missingKeys} missing translation${pluralize(missingKeys)}${(unknownKeys) ? ` and ${unknownKeys} invalid key${pluralize(unknownKeys)}` : ''}; ${coverage}% translated.`, (missingKeys) ? 'error' : 'success')
        } else {
          log(callback, `${relativePath} is valid and 100% translated!`, 'success')
        }
      })
    })
  } catch (err) {
    log(callback, `${relativePath}: ${err.message}`, 'warn')
    log(callback, `${relativePath}: ${err}`, 'trace')
  }
}

export const validateSchema = (rootPath, schemaPath, callback) => {
  try {
    const fileStats = fs.lstatSync(rootPath)
    const results = []
    let totalCount = 0
    let fileCount = 0
    let tp = 'success'
    if (fileStats.isFile()) {
      _validateSchema(rootPath, schemaPath, callback)
    } else if (fileStats.isDirectory()) {
      const readFiles = (dir) => fs.readdir(dir, (err, files) => {
        if (err) {
          if (callback) callback(err, 'error')
          return
        }
        files.forEach((file) => {
          const filePath = path.resolve(dir, file)
          if (file.match(/\.json$/)) {
            totalCount++
            _validateSchema(filePath, schemaPath, (message, type) => {
              if (callback) {
                if (type === 'error' || type === 'success') {
                  results.push(message)
                  fileCount++
                  if (type === 'error') tp = 'error'
                } else {
                  callback(message, type)
                }
              }
              if (totalCount === fileCount) {
                if (callback) callback(results.join('\n'), tp)
              }
            })
          }
          else {
            fs.stat(filePath, (err, stat) => {
              if (stat && stat.isDirectory()) {
                readFiles(filePath)
              }
            })
          }
        })
      })
      readFiles(rootPath)
    } else {
      if (callback) callback('path is not a file or directory', 'error')
    }
  } catch (err) {
    if (callback) callback(err, 'error')
  }
}

function _exportTranslationKeys(rootPath, filePath, logger, callback) {
  const templates = []
  fs.readFile(filePath, 'utf-8', (err, contents) => {
    if (err) {
      logger(err, 'error')
      return
    }
    readFile(rootPath, filePath, templates, contents, (text, type) => {
      switch (type) {
        case 'info':
        case 'warn':
          if (logger) logger(text, type)
          if (callback) callback(JSON.stringify(templates))
          break
        default:
          if (logger) logger(text, type)
          break
      }
    })
  })
}

export const exportTranslationKeys = (rootPath, filePath, logger, callback) => {
  const fullPath = path.resolve(rootPath, filePath)
  const fileStats = fs.lstatSync(fullPath)
  const templates = []
  let totalCount = 0
  let fileCount = 0
  if (fileStats.isFile()) {
    _exportTranslationKeys(rootPath, fullPath, logger, callback)
  } else if (fileStats.isDirectory()) {
    const readFiles = (dir) => fs.readdir(dir, (err, files) => {
      if (err) {
        if (logger) logger(err, 'error')
        return
      }
      files.forEach((file) => {
        const filePath = path.resolve(dir, file)
        if (file.match(/\.jsx?$/)) {
          totalCount++
          _exportTranslationKeys(rootPath, filePath, logger, (tmpls) => {
            fileCount++
            templates.push(...JSON.parse(tmpls))
            if (totalCount === fileCount) {
              if (callback) callback(JSON.stringify(sortByKey(templates, 'group')))
            }
          })
        }
        else {
          fs.stat(filePath, (err, stat) => {
            if (stat && stat.isDirectory()) {
              readFiles(filePath)
            }
          })
        }
      })
    })
    readFiles(fullPath)
  } else {
    if (callback) callback(JSON.stringify([]))
  }
}

export default function (srcPath, filter, schema, callback) {
  const templates = []
  const filterRegexp = new RegExp(filter)
  let fileCount = 0, fileCountRead = 0
  const readFiles = (dir) => fs.readdir(dir, (err, files) => {
    if (err) {
      log(callback, err, 'error')
      return
    }
    files.forEach((file) => {
      const filePath = path.resolve(dir, file)
      if (file.match(filterRegexp)) {
        fileCount++
        fs.readFile(filePath, 'utf-8', (err, contents) => {
          readFile(srcPath, filePath, templates, contents, callback)
          fileCountRead++
          if (fileCount === fileCountRead) {
            saveSchema(srcPath, filter, sortByKey(templates, 'group'), schema, callback)
          }
        })
      }
      else {
        fs.stat(filePath, (err, stat) => {
          if (stat && stat.isDirectory()) {
            readFiles(filePath)
          }
        })
      }
    })
  })

  readFiles(srcPath)
}