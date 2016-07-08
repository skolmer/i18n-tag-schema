// index.d.ts

/**
 * Generates a JSON schema based on i18n tagged template literals.
 * If no target schema is provided the json will be returned via callback output param.
 *
 * @param path Base path of the source directory.
 * @param filter File extension filter as regex string.
 * @param schema Optional. Path to the generated .json file. If no target schema is provided the json will be returned via callback output param
 * @param grouped Optional. If true, translations will be grouped by filename
 * @param callback Optional. A callback function.
 */
export default function (path: string, filter: string, schema?: string, grouped?: boolean, callback?: (output: string, type: 'info' | 'warn' | 'error' | 'success' | 'debug' | 'trace') => void) 

/**
 * Generates an array of all i18n tagged template literals in a file.
 * The array will be returned as json via callback output param.
 *
 * @param rootPath Root path of the source directory.
 * @param filePath Absolute path of the source file.
 * @param grouped Optional. If true, translations will be grouped by filename relative to the root path
 * @param logger Optional. A logger function that accepts logging message and type 'info', 'warn', 'error', 'success', 'debug' or 'trace'.
 * @param callback Optional. A callback function.
 */
export function templatesFromFile(rootPath: string, filePath: string, grouped?: boolean, logger?: (message: string, type: 'info' | 'warn' | 'error' | 'success' | 'debug' | 'trace') => void, callback?: (output: string) => void)

/**
 * Validates a translation file and calculates translation coverage
 *
 * @param filePath Absolute path of the translation file.
 * @param schemaPath Absolute path of the translation schema.
 * @param callback Optional. A callback function that accepts logging message and type 'info', 'warn', 'error', 'success', 'debug' or 'trace'.
 */
export function vaidateSchema(filePath: string, schemaPath: string, callback: (message: string, type: 'info' | 'warn' | 'error' | 'success' | 'debug' | 'trace') => void)