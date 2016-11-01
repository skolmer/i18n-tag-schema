import * as fs from 'fs'
import * as path from 'path'
import {log, logTrace, logWarn, logError} from './logging'
import debounce from 'lodash/debounce'
import { exportTranslationKeysFromFile, readFileTemplates } from './export'
import { saveSchema } from './schema'
import { validateFile } from './validation'

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

function sortByKey(array, key) {
  return array.sort(function (a, b) {
    const x = a[key] || a, y = b[key] || b
    return ((x < y) ? -1 : ((x > y) ? 1 : 0))
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
          if (file.match(/\.json$/) && filePath !== schemaPath) {
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
                  tmpls.forEach((item) => {
                    let grp
                    if(item.group && (grp = templates.find((g) => g.group === item.group))) {
                      item.items.forEach((itm) => {
                        if(grp.items.indexOf(itm) === -1) grp.items.push(itm)
                      })
                    } else {
                      if(templates.indexOf(item) === -1) templates.push(item)
                    }
                  })          
                }
                if (totalCount === fileCount) {
                  log(logger, `exported ${templates.length} translation keys from ${fullPath}`)
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
 * generateTranslationSchema generates a JSON schema of all i18n tagged template literals in `srcPath`
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
export const generateTranslationSchema = ({ srcPath, schemaPath, filter = defaultFileFilter, logger, callback, progress }) => {
  if(!srcPath) {
    const error = 'srcPath is not defined.'
    logError(logger, error)
    if(callback) callback(1, error)
    return
  }
  try {
    const progressCallback = (progress) ? debounce(progress, 100) : () => {}
    let templatePatterns = {}
    let templates = []
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
            const tmpl = readFileTemplates(srcPath, filePath, templates, templatePatterns, contents, logger)
            templatePatterns = tmpl.templatePatterns
            templates = tmpl.templates
            fileCountRead++
            progressCallback(fileCountRead, fileCount, filePath)
            if (fileCount === fileCountRead) {
              saveSchema({srcPath, templates: sortByKey(templates, 'group'), templatePatterns, schemaPath, callback, logger})
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