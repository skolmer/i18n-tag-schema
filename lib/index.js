import * as fs from 'fs'
import * as path from 'path'
import escapeStringRegexp from 'escape-string-regexp'
import * as babylon from 'babylon'
import traverse from 'babel-traverse'
import Ajv from 'ajv'
import {log, logInfo, logTrace, logWarn, logError} from './logging'
import debounce from 'lodash/debounce'

/**
 * This is the default callback type.
 *
 * @callback requestCallback
 * @param {number} status - The status code. 0 means success.
 * @param {string} message - The status message.
 */

/**
 * This is the logging function type.
 *
 * @callback loggingCallback
 * @param {string} message - The status message.
 */

/**
 * This is the progress callback function type.
 *
 * @callback progressCallback
 * @param {number} current - The current item count.
 * @param {number} total - The total item count.
 * @param {string} name - Item name
 */

/**
 * @typedef logger
 * @type {object}
 * @property {loggingCallback} [log] - The default logging function.
 * @property {loggingCallback} [info] - The info logging function.
 * @property {loggingCallback} [trace] - The trace logging function.
 * @property {loggingCallback} [warn] - The warn logging function.
 * @property {loggingCallback} [error] - The error logging function.
 * @property {loggingCallback} [success] - The success logging function.
 * @property {boolean} [toConsole] - The success logging function.
 */

const defaultFileFilter = /\.jsx?$/
const schemaProperty = '$schema'
const templatePatterns = {}

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

function addTemplateProp(obj, tmpl) {
  obj[tmpl] = {
    type: 'string',
    minLength: 1,
    pattern: (templatePatterns[tmpl])?templatePatterns[tmpl]:undefined
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

/**
 * i18nTagSchema generates a JSON schema of all i18n tagged template literals in `srcPath`
 * 
 * @param {Object} options - The export options.
 * @param {string} options.srcPath - The root directory of your source files.
 * @param {Object[]} [options.templates] - A regex to filter source files by name or extension. Defaults to `\.jsx?$`.
 * @param {string} [options.schemaPath] - The target path of the JSON schema.  
 * @param {requestCallback} [options.callback] - A callback function that will be called when the function completes.
 * @param {logger} [options.logger] - A custom logger.
 */
function saveSchema({srcPath, templates, schemaPath, callback, logger}) {
  const successMessage = 'i18n json schema has been generated'

  if (templates && templates.length) {   
    const newSchema = generateSchema(templates)
    const schemaString = JSON.stringify(newSchema, null, '\t')    
    
    if (schemaPath) {
      let prevJson
      if (fs.existsSync(schemaPath)) {
        try {
          prevJson = fs.readFileSync(schemaPath, 'utf-8')
        } catch (err) {
          logWarn(logger, err.message)
          logTrace(logger, err)
        }
      }
      fs.writeFile(schemaPath, schemaString, 'utf-8', function (err) {
        if (err) {
          logError(logger, err.message)
          logTrace(logger, err)
          callback(1, newSchema) 
          return
        }

        const diff = jsonDiff(prevJson, newSchema, callback)
        const message = `${successMessage}; contains ${diff.count} keys  ( ${diff.added.length} added / ${diff.removed.length} removed ): ${schemaPath}`
        log(logger, message)
        callback(0, newSchema)
      })
    } else {
      log(logger, successMessage)
      callback(0, newSchema)      
    }
  } else {
    const emptySchema = JSON.stringify({}, null, '\t')
    const message = `No i18n tagged template literals found in '${srcPath}'`
    if (schemaPath) {
      fs.writeFile(schemaPath, emptySchema, 'utf-8', function (err) {
        if (err) {
          logError(logger, err.message)
          logTrace(logger, err)
          callback(1, {}) 
          return
        }
        logWarn(logger, message)
        log(logger, successMessage)
        callback(0, {}) 
      })
    } else {
      logWarn(logger, message)
      log(callback, successMessage)
      callback(0, {}) 
    }
  }
}

function jsonDiff(oldJson, newObj, logger) {
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
      logWarn(logger, err.message)
      logTrace(logger, err)
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
        templatePatterns[template] = regex
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

function readFileTemplates(rootPath, filePath, templates, contents, logger) {
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
      logInfo(logger, `${path.relative(rootPath, filePath)} (${length} template${(length === 1) ? '' : 's'})`)
    } else {
      logInfo(logger, `${path.relative(rootPath, filePath)} (0 templates)`)
    }
  } catch (err) {
    logWarn(logger, `${filePath}: ${err.message}`)
    logTrace(logger, err)
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

function validateFile({filePath, schemaPath, callback, logger}) {
  if(!filePath) {
    const error = 'filePath is not defined.'
    logError(logger, error)
    if(callback) callback(1, error)
    return
  }
  const relativePath = path.basename(filePath)
  try {
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        if(callback) callback(1, err.message)
        return
      }
      const dataObject = JSON.parse(data)
      fs.readFile(schemaPath, 'utf-8', (err, schema) => {
        if (err) {
          if(callback) callback(1, err.message)
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
            logWarn(logger, message)
          })
          const coverage = (totalKeys.count) ? Math.round(((totalKeys.count - missingKeys) / totalKeys.count) * 100) : 0
          const pluralize = (val) => (val === 1) ? '' : 's'
          if(callback) callback((missingKeys)?1:0, `${relativePath} has ${missingKeys} missing translation${pluralize(missingKeys)}${(unknownKeys) ? ` and ${unknownKeys} invalid key${pluralize(unknownKeys)}` : ''}; ${coverage}% translated.`)
        } else {
          if(callback) callback(0, `${relativePath} is valid and 100% translated!`)
        }
      })
    })
  } catch (err) {
    logError(logger, `${relativePath}: ${err.message}`)
    logTrace(logger, err)
    if (callback) callback(1, err.message) 
  }
}

/**
 * exportTranslationKeys exports all i18n tagged template literals in `srcPath`
 * 
 * @param {Object} options - The schema generator options.
 * @param {string} options.rootPath - The root directory of your source files.
 * @param {string} options.filePath - The full path of the source file.
 * @param {requestCallback} options.callback - A callback function that will be called when the function completes.
 * @param {logger} [options.logger] - A custom logger.
 */
function exportTranslationKeysFromFile({rootPath, filePath, callback, logger}) {
  const templates = []
  fs.readFile(filePath, 'utf-8', (err, contents) => {
    if (err) {
      logError(logger, `${filePath}: ${err.messag}`)
      logTrace(logger, err)
      if(callback) callback(1, [])
    }
    readFileTemplates(rootPath, filePath, templates, contents, logger)
    if(callback) callback(0, templates)
  })
}

/**
 * validateTranslations validates your translations agains a JSON schema.
 * 
 * @export
 * @param {Object} options - The schema generator options.
 * @param {string} options.rootPath - The root directory of your translation files or the path to a single JSON file.
 * @param {string} [options.schemaPath] - The full path of the JSON schema.
 * @param {requestCallback} [options.callback] - A callback function that will be called when the function completes.
 * @param {logger} [options.logger] - A custom logger.
 * @param {progress} [options.progress] - A progress callback.
 */
export const validateTranslations = ({rootPath, schemaPath, callback, logger, progress}) => {
  if(!rootPath) {
    const error = 'rootPath is not defined.'
    logError(logger, error)
    if(callback) callback(1, error)
    return
  }
  if(!schemaPath) {
    const error = 'schemaPath is not defined.'
    logError(logger, error)
    if(callback) callback(1, error)
    return
  }
  try {
    const progressCallback = (progress) ? debounce(progress, 100) : () => {}
    const fileStats = fs.lstatSync(rootPath)
    const results = []
    let totalCount = 0
    let fileCount = 0
    let finalStatus = 0
    if (fileStats.isFile()) {
      validateFile({
        filePath: rootPath, 
        schemaPath, 
        callback,
        logger
      })
      progressCallback(1, 1, rootPath)
    } else if (fileStats.isDirectory()) {
      const readFiles = (dir) => fs.readdir(dir, (err, files) => {
        if(err) {
          logWarn(logger, `${dir}: ${err.message}`)
          logTrace(logger, err)
          if(dir === rootPath && callback) {
            callback(1, [])
          }
          return
        }
        files.forEach((file) => {
          const filePath = path.resolve(dir, file)
          if (file.match(/\.json$/)) {
            totalCount++
            validateFile({
              filePath, 
              schemaPath, 
              callback: (status, result) => {
                if(status !== 0) finalStatus = 1
                results.push(result)
                fileCount++
                progressCallback(fileCount, totalCount, filePath)
                if (totalCount === fileCount) {
                  if (callback) callback(finalStatus, results.join('\n'))
                }
              },
              logger
            })
          }
          else {
            fs.stat(filePath, (err, stat) => {
              if(err) {
                logWarn(logger, `${filePath}: ${err.message}`)
                logTrace(logger, err)
                return
              }
              if (stat && stat.isDirectory()) {
                readFiles(filePath)
              }
            })
          }
        })
      })
      readFiles(rootPath)
    } else {
      const error = `${rootPath}: is not a file or directory`
      logWarn(logger, error)
      if (callback) callback(1, error)   
    }
  } catch (err) {
    logError(logger, `${rootPath}: ${err.message}`)
    logTrace(logger, err)
    if (callback) callback(1, err.message)    
  }
}

/**
 * exportTranslationKeys exports all i18n tagged template literals in `srcPath`
 * 
 * @export
 * @param {Object} options - The schema generator options.
 * @param {string} options.rootPath - The root directory of your source files.
 * @param {string} [options.filePath] - The full path of the source file.
 * @param {RegExp} [options.filter] - A regex to filter source files by name or extension. Defaults to `\.jsx?$`.
 * @param {requestCallback} [options.callback] - A callback function that will be called when the function completes.
 * @param {logger} [options.logger] - A custom logger.
 * @param {progress} [options.progress] - A progress callback.
 */
export const exportTranslationKeys = ({rootPath, filePath = '.', filter = defaultFileFilter, callback, logger, progress}) => {
  if(!rootPath) {
    const error = 'rootPath is not defined.'
    logError(logger, error)
    if(callback) callback(1, error)
    return
  }
  try {
    const progressCallback = (progress) ? debounce(progress, 100) : () => {}
    const fullPath = path.resolve(rootPath, filePath)
    const fileStats = fs.lstatSync(fullPath)
    const templates = []
    let totalCount = 0
    let fileCount = 0
    if (fileStats.isFile()) {    
      exportTranslationKeysFromFile({
        rootPath, 
        filePath: fullPath, 
        logger, 
        callback
      })
      progressCallback(1, 1, fullPath)
    } else if (fileStats.isDirectory()) {
      const readFiles = (dir) => fs.readdir(dir, (err, files) => {
        if(err) {
          logWarn(logger, `${dir}: ${err.message}`)
          logTrace(logger, err)
          if(dir === fullPath && callback) {
            callback(1, [])
          }
          return
        }
        files.forEach((file) => {
          const filePath = path.resolve(dir, file)
          if (file.match(filter)) {
            totalCount++
            exportTranslationKeysFromFile({
              rootPath, 
              filePath, 
              logger, 
              callback: (status, tmpls) => {
                fileCount++
                progressCallback(fileCount, totalCount, filePath)
                if(status === 0)  {
                  templates.push(...JSON.parse(tmpls))                
                }
                if (totalCount === fileCount) {
                  if (callback) callback(status, sortByKey(templates, 'group'))
                }
              }
            })
          }
          else {
            fs.stat(filePath, (err, stat) => {
              if(err) {
                logWarn(logger, `${filePath}: ${err.message}`)
                logTrace(logger, err)
                return
              }
              if (stat && stat.isDirectory()) {
                readFiles(filePath)
              }
            })
          }
        })
      })
      readFiles(fullPath)
    } else {
      logWarn(logger, `${fullPath}: is not a file or directory`)
      if (callback) callback(1, [])
    }
  } catch (err) {
    logError(logger, `${rootPath}: ${err.message}`)
    logTrace(logger, err)
    if (callback) callback(1, err.message)    
  }
}


/**
 * i18nTagSchema generates a JSON schema of all i18n tagged template literals in `srcPath`
 * 
 * @export
 * @param {Object} options - The schema generator options.
 * @param {string} options.srcPath - The root directory of your source files.
 * @param {RegExp} [options.filter] - A regex to filter source files by name or extension. Defaults to `\.jsx?$`.
 * @param {string} [options.schemaPath] - The target path of the JSON schema.  
 * @param {requestCallback} [options.callback] - A callback function that will be called when the function completes.
 * @param {logger} [options.logger] - A custom logger.
 * @param {progress} [options.progress] - A progress callback.
 */
export default function ({ srcPath, schemaPath, filter = defaultFileFilter, logger, callback, progress }) {
  if(!srcPath) {
    const error = 'srcPath is not defined.'
    logError(logger, error)
    if(callback) callback(1, error)
    return
  }
  try {
    const progressCallback = (progress) ? debounce(progress, 100) : () => {}
    const templates = []
    const filterRegexp = new RegExp(filter)
    let fileCount = 0, fileCountRead = 0
    const readFiles = (dir) => fs.readdir(dir, (err, files) => {
      if (err) {
        logError(logger, err)
        callback(1, err.message)
        return
      }
      files.forEach((file) => {
        const filePath = path.resolve(dir, file)
        if (file.match(filterRegexp)) {
          fileCount++
          fs.readFile(filePath, 'utf-8', (err, contents) => {
            if(err) {
              logWarn(logger, `${filePath}: ${err.message}`)
              logTrace(logger, err)
              return
            }
            readFileTemplates(srcPath, filePath, templates, contents, logger)
            fileCountRead++
            progressCallback(fileCountRead, fileCount, filePath)
            if (fileCount === fileCountRead) {
              saveSchema({srcPath, templates: sortByKey(templates, 'group'), schemaPath, callback, logger})
            }
          })
        }
        else {
          fs.stat(filePath, (err, stat) => {
            if(err) {
              logWarn(logger, `${filePath}: ${err.message}`)
              logTrace(logger, err)
              return
            }
            if (stat && stat.isDirectory()) {
              readFiles(filePath)
            }
          })
        }
      })
    })

    readFiles(srcPath)
  } catch (err) {
    logError(logger, `${srcPath}: ${err.message}`)
    logTrace(logger, err)
    if (callback) callback(1, err.message)    
  }
}