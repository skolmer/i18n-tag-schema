import Ajv from 'ajv'
import * as fs from 'fs'
import * as path from 'path'
import {logTrace, logWarn, logError} from './logging'

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

export const validateFile = ({filePath, schemaPath, callback, logger}) => {
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