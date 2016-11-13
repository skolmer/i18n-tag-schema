import { exportTranslationKeysFromFiles } from './export'
import { saveSchema } from './schema'
import { validateTranslationFiles } from './validation'

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
 * @property {loggingCallback} [info] - The info logging function.
 * @property {loggingCallback} [trace] - The trace logging function.
 * @property {loggingCallback} [warn] - The warn logging function.
 * @property {loggingCallback} [error] - The error logging function.
 * @property {boolean} [toConsole] - The success logging function.
 */

/**
 * validateTranslations validates your translations agains a JSON schema.
 *
 * @export
 * @param {object} options - The schema generator options.
 * @param {string} options.rootPath - The root directory of your translation files or the path to a single JSON file.
 * @param {string} [options.schemaPath] - The full path of the JSON schema.
 * @param {logger} [options.logger] - A custom logger.
 * @param {progress} [options.progress] - A progress callback.
 */
export const validateTranslations = async ({rootPath, schemaPath, logger, progress}) => {
  return await validateTranslationFiles({rootPath, schemaPath, logger, progress})
}

/**
 * exportTranslationKeys exports all i18n tagged template literals in `srcPath`
 *
 * @export
 * @param {object} options - The schema generator options.
 * @param {string} options.rootPath - The root directory of your source files.
 * @param {string} [options.filePath] - The full path of the source file.
 * @param {RegExp} [options.filter] - A regex to filter source files by name or extension. Defaults to `\.jsx?$`.
 * @param {logger} [options.logger] - A custom logger.
 * @param {progress} [options.progress] - A progress callback.
 * @param {string} [options.preprocessor] - A custom preprocessor like `./preprocessors/typescript`.
 * @param {object} [options.babylonConfig] - A custom babylon configuration.
 */
export const exportTranslationKeys = async ({rootPath, filePath, filter, logger, progress, preprocessor, babylonConfig}) => {
  const { templates } = await exportTranslationKeysFromFiles({rootPath, filePath, filter, logger, progress, preprocessor, babylonConfig})
  return templates
}


/**
 * generateTranslationSchema generates a JSON schema of all i18n tagged template literals in `srcPath`
 *
 * @export
 * @param {object} options - The schema generator options.
 * @param {string} options.rootPath - The root directory of your source files.
 * @param {RegExp} [options.filter] - A regex to filter source files by name or extension. Defaults to `\.jsx?$`.
 * @param {string} [options.schemaPath] - The target path of the JSON schema.
 * @param {logger} [options.logger] - A custom logger.
 * @param {progress} [options.progress] - A progress callback.
 * @param {string} [options.preprocessor] - A custom preprocessor like `./preprocessors/typescript`.
 * @param {object} [options.babylonConfig] - A custom babylon configuration.
 * @param {number} [options.indention] - The number of spaces to be used instead of tabs. if not set tabs will be used.
 */
export const generateTranslationSchema = async ({ rootPath, schemaPath, filter, logger, callback, progress, preprocessor, babylonConfig, indention }) => {
  const { templates, templatePatterns } = await exportTranslationKeysFromFiles({ rootPath, filter, logger, progress, preprocessor, babylonConfig })
  return await saveSchema({rootPath, templates, templatePatterns, schemaPath, callback, logger, indention})
}