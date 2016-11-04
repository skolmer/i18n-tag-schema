import {log, logTrace, logWarn, logError} from './logging'
import * as fs from 'fs'

const schemaProperty = '$schema'

function addTemplateProp(obj, tmpl, templatePatterns) {
  obj[tmpl] = {
    type: 'string',
    minLength: 1,
    pattern: (templatePatterns[tmpl])?templatePatterns[tmpl]:undefined
  }
}

function addTemplateGroup(obj, tmpl, templatePatterns) {
  const props = {}
  tmpl.items.forEach((t) => addTemplateProp(props, t, templatePatterns))
  obj[tmpl.group] = {
    type: 'object',
    properties: props,
    required: tmpl.items
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

export const generateSchema = ({templates, templatePatterns}) => {
  const props = {
    [schemaProperty]: {
      type: 'string'
    }
  }
  templates.forEach((tmpl) => (tmpl.group) ? addTemplateGroup(props, tmpl, templatePatterns) : addTemplateProp(props, tmpl, templatePatterns))
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
 * @param {Object} [options.templatePatterns] - A list of patterns to validate template properties.
 * @param {string} [options.schemaPath] - The target path of the JSON schema.
 * @param {requestCallback} [options.callback] - A callback function that will be called when the function completes.
 * @param {logger} [options.logger] - A custom logger.
 */
export const saveSchema = ({srcPath, templates, templatePatterns, schemaPath, callback, logger}) => {
  const successMessage = 'i18n json schema has been generated'

  if (templates && templates.length) {
    const newSchema = generateSchema({templates, templatePatterns})
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
          if(callback) callback(1, newSchema)
          return
        }

        const diff = jsonDiff(prevJson, newSchema, callback)
        const message = `${successMessage}; contains ${diff.count} keys  ( ${diff.added.length} added / ${diff.removed.length} removed ): ${schemaPath}`
        log(logger, message)
        if(callback) callback(0, newSchema)
      })
    } else {
      log(logger, successMessage)
      if(callback) callback(0, newSchema)
    }
  } else {
    const emptySchema = JSON.stringify({}, null, '\t')
    const message = `No i18n tagged template literals found in '${srcPath}'`
    if (schemaPath) {
      fs.writeFile(schemaPath, emptySchema, 'utf-8', function (err) {
        if (err) {
          logError(logger, err.message)
          logTrace(logger, err)
          if(callback) callback(1, {})
          return
        }
        logWarn(logger, message)
        log(logger, successMessage)
        if(callback) callback(0, {})
      })
    } else {
      logWarn(logger, message)
      log(callback, successMessage)
      if(callback) callback(0, {})
    }
  }
}
