import * as path from 'path'
import * as fs from 'mz/fs'
import {logInfo, logTrace, logWarn, logError} from './logging'
import {parseFile} from './parser'
import {sortTemplates, mergeTemplates} from './utils'
import throttle from 'lodash/throttle'

/**
 * @typedef logger
 * @type {object}
 * @property {loggingCallback} [info] - The info logging function.
 * @property {loggingCallback} [trace] - The trace logging function.
 * @property {loggingCallback} [warn] - The warn logging function.
 * @property {loggingCallback} [error] - The error logging function.
 * @property {boolean} [toConsole] - The success logging function.
 */

/**
 * readFileTemplates reads all i18n tagged template literals from javascript
 *
 * @param {object} options - The export options.
 * @param {string} options.rootPath - The root directory of your source files.
 * @param {string} options.filePath - The full path of the source file.
 * @param {Array} options.templates - The current list of templates.
 * @param {object} options.templatePatterns - The current map of template patterns.
 * @param {string} options.contents - The content of a javascript file as a string.
 * @param {logger} [options.logger] - A custom logger.
 * @param {string} [options.preprocessor] - A custom preprocessor like `preprocessors/typescript`.
 * @param {object} [options.babylonConfig] - A custom babylon configuration.
 */
const readFileTemplates = ({rootPath, filePath, templates = [], templatePatterns = {}, contents, logger, preprocessor, babylonConfig}) => {
  const parsed = parseFile(contents, templatePatterns, preprocessor, babylonConfig)
  const {
    templates: {
      length
    },
    templates: parsedTemplates,
    templatePatterns: parsedTemplatePatterns
  } = parsed
  const newTemplatePatterns = { ...templatePatterns, ...parsedTemplatePatterns }
  let newTemplates = templates

  if (length) {
    const fileGroup = path.relative(rootPath, filePath).replace(/\\/g, '/')
    newTemplates = mergeTemplates(templates, parsedTemplates, fileGroup)
    logInfo(logger, `${path.relative(rootPath, filePath)} (${length} template${(length === 1) ? '' : 's'})`)
  } else {
    logTrace(logger, `${path.relative(rootPath, filePath)} (0 templates)`)
  }
  return { templates: newTemplates, templatePatterns: newTemplatePatterns }
}

/**
 * exportTranslationKeysFromFiles exports all i18n tagged template literals in `srcPath`
 *
 * @export
 * @param {Object} options - The schema generator options.
 * @param {string} options.rootPath - The root directory of your source files.
 * @param {string} [options.filePath] - The full path of the source file.
 * @param {RegExp} [options.filter] - A regex to filter source files by name or extension. Defaults to `\.jsx?$`.
 * @param {logger} [options.logger] - A custom logger.
 * @param {progress} [options.progress] - A progress callback.
 * @param {string} [options.preprocessor] - A custom preprocessor like `preprocessors/typescript`.
 * @param {object} [options.babylonConfig] - A custom babylon configuration.
 */
export const exportTranslationKeysFromFiles = async ({rootPath, filePath = '.', filter = /\.jsx?$/, logger, progress, preprocessor, babylonConfig}) => {
  if(!rootPath) {
    const error = 'rootPath is not defined.'
    logError(logger, error)
    throw new Error(error)
  }
  const progressCallback = (progress) ? throttle(progress, 16, true) : () => {}
  const fullPath = path.resolve(rootPath, filePath)
  const fileStats = fs.lstatSync(fullPath)
  if (fileStats.isFile()) {
    const contents = await fs.readFile(fullPath, 'utf-8')
    const { templates, templatePatterns } = readFileTemplates({rootPath, filePath, templates, contents, logger, preprocessor, babylonConfig})
    progressCallback(1, 1, fullPath)
    logInfo(logger, `exported ${templates.length} translation keys from ${fullPath}`)
    return { templates: sortTemplates(templates), templatePatterns }
  } else {
    const fileNames = []
    const readFiles = async (dir) => {
      try {
        const files = await fs.readdir(dir)
        for(const file of files) {
          const filePath = path.resolve(dir, file)
          if (file.match(filter)) {
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
        if(dir === fullPath) {
          return { templates: [], templatePatterns: {} }
        }
      }
    }
    await readFiles(fullPath)
    let fileCount = 0
    const totalCount = fileNames.length
    let templates
    let templatePatterns
    progressCallback(fileCount, totalCount, '')
    for(const fileName of fileNames) {
      const { file, filePath } = fileName
      try {
        const contents = await fs.readFile(filePath, 'utf-8')
        const result = readFileTemplates({rootPath, filePath, templates, templatePatterns, contents, logger, preprocessor, babylonConfig})
        templates = result.templates
        templatePatterns = result.templatePatterns
      } catch(err) {
        logError(logger, `${file}: ${err.message}`)
        logTrace(logger, err)
      }
      fileCount++
      progressCallback(fileCount, totalCount, file)
    }
    if(fileNames.length && progress) progress(totalCount, totalCount, fileNames[fileNames.length-1].file)
    logInfo(logger, `exported ${templates.length} translation keys from ${fullPath}`)
    return { templates: sortTemplates(templates), templatePatterns }
  }
}