import * as fs from 'mz/fs'
import * as path from 'path'
import {logTrace, logWarn, logError} from './logging'
import throttle from 'lodash/throttle'
import { exportTranslationKeysFromFiles } from './export'
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
    const progressCallback = (progress) ? throttle(progress, 100) : () => {}
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
    } else {
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
                progressCallback(fileCount, totalCount, file)
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
 * @param {logger} [options.logger] - A custom logger.
 * @param {progress} [options.progress] - A progress callback.
 * @param {boolean} [typescript] - Set to true if typescript should be supported
 */
export const exportTranslationKeys = async ({rootPath, filePath, filter, logger, progress, typescript}) => {
  const { templates } = await exportTranslationKeysFromFiles({rootPath, filePath, filter, logger, progress, typescript})
  return templates
}


/**
 * generateTranslationSchema generates a JSON schema of all i18n tagged template literals in `srcPath`
 *
 * @export
 * @param {Object} options - The schema generator options.
 * @param {string} options.rootPath - The root directory of your source files.
 * @param {RegExp} [options.filter] - A regex to filter source files by name or extension. Defaults to `\.jsx?$`.
 * @param {string} [options.schemaPath] - The target path of the JSON schema.
 * @param {requestCallback} [options.callback] - A callback function that will be called when the function completes.
 * @param {logger} [options.logger] - A custom logger.
 * @param {progress} [options.progress] - A progress callback.
 * @param {boolean} [options.typescript] - Set to true if typescript should be supported
 */
export const generateTranslationSchema = async ({ rootPath, schemaPath, filter, logger, callback, progress, typescript }) => {
  const { templates, templatePatterns } = await exportTranslationKeysFromFiles({ rootPath, filter, logger, progress, typescript })
  return await saveSchema({rootPath, templates, templatePatterns, schemaPath, callback, logger})
}