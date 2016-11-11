import Ajv from 'ajv'
import * as fs from 'mz/fs'
import * as path from 'path'
import {logTrace, logWarn, logError} from './logging'
import throttle from 'lodash/throttle'

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

export const validateFile = async ({filePath, schemaPath, logger}) => {
  const relativePath = path.basename(filePath)
  const data = await fs.readFile(filePath, 'utf-8')
  const dataObject = JSON.parse(data)
  const schema = await fs.readFile(schemaPath, 'utf-8')
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
      }
      logWarn(logger, message)
    })
    const coverage = (totalKeys.count) ? Math.round(((totalKeys.count - missingKeys) / totalKeys.count) * 100) : 0
    const pluralize = (val) => (val === 1) ? '' : 's'
    const result = `${relativePath} has ${missingKeys} missing translation${pluralize(missingKeys)}${(unknownKeys) ? ` and ${unknownKeys} invalid key${pluralize(unknownKeys)}` : ''}; ${coverage}% translated.`
    if(missingKeys) {
      throw new Error(result)
    } else {
      return result
    }
  } else {
    return `${relativePath} is valid and 100% translated!`
  }
}

/**
 * validateTranslationFiles validates your translations agains a JSON schema.
 *
 * @export
 * @param {Object} options - The schema generator options.
 * @param {string} options.rootPath - The root directory of your translation files or the path to a single JSON file.
 * @param {string} [options.schemaPath] - The full path of the JSON schema.
 * @param {logger} [options.logger] - A custom logger.
 * @param {progress} [options.progress] - A progress callback.
 */
export const validateTranslationFiles = async ({rootPath, schemaPath, logger, progress}) => {
  if(!rootPath) {
    const error = 'rootPath is not defined.'
    logError(logger, error)
    throw new Error(error)
  }
  if(!schemaPath) {
    const error = 'schemaPath is not defined.'
    logError(logger, error)
    throw new Error(error)
  }
  if(!await fs.exists(schemaPath)) {
    const error = 'schemaPath file does not exist.'
    logError(logger, error)
    throw new Error(error)
  }
  const progressCallback = (progress) ? throttle(progress, 16) : () => {}
  const fileStats = await fs.lstat(rootPath)
  if (fileStats.isFile()) {
    const result = await validateFile({
      filePath: rootPath,
      schemaPath,
      logger
    })
    progressCallback(1, 1, rootPath)
    return result
  } else {
    const fileNames = []
    const readFiles = async (dir) => {
      try {
        const files = await fs.readdir(dir)
        for(const file of files) {
          const filePath = path.resolve(dir, file)
          if (file.match(/\.json$/) && filePath !== schemaPath) {
            fileNames.push({file, filePath})
          }
          else {
            try {
              const stat = await fs.stat(filePath)
              if (stat.isDirectory()) {
                await readFiles(filePath)
              }
            } catch(err) {
              logWarn(logger, `${filePath}: ${err.message}`)
              logTrace(logger, err)
            }
          }
        }
      } catch (err) {
        logWarn(logger, `${dir}: ${err.message}`)
        logTrace(logger, err)
        if(dir === rootPath) {
          throw err
        }
      }
    }
    await readFiles(rootPath)
    let fileCount = 0
    const totalCount = fileNames.length
    const results = []
    let success = true
    progressCallback(fileCount, totalCount, '')
    for(const fileName of fileNames) {
      const { file, filePath } = fileName
      try {
        const result = await validateFile({
          filePath,
          schemaPath,
          logger
        })
        results.push(result)
      } catch (err) {
        const error = `${file}: ${err.message}`
        logError(logger, error)
        logTrace(logger, err)
        results.push(error)
        success = false
      }
      fileCount++
      progressCallback(fileCount, totalCount, file)
    }
    if(fileNames.length && progress) progress(totalCount, totalCount, fileNames[fileNames.length-1].file)
    if(success) {
      return results.join('\n')
    }
    throw new Error(results.join('\n'))
  }
}