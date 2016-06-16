// index.d.ts

/**
 * Generates a JSON schema based on i18n tagged template literals
 * If no target schema is provided the json will be returned via callback output param
 *
 * @param path Base path of the source directory.
 * @param filter File extension filter as regex string.
 * @param schema Optional. Path to the generated .json file. If no target schema is provided the json will be returned via callback output param
 * @param grouped Optional. If true, translations will be grouped by filename
 * @param callback Optional. A callback function.
 */
export default function func(path: string, filter: string, schema?: string, grouped?: boolean, callback?: (output: string, type: 'info' | 'warn' | 'error' | 'success' | 'debug' | 'trace') => void) 