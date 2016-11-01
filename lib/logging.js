/**
 * Logging helper function
 * 
 * @param {Object} logger - The logger object.
 * @param {any} message - The message to log.
 * @param {string} [type=log] - The type of the log function.
 */
export function log(logger, message, type = log) {
  if(!logger) return 
  if(logger.toConsole) {
    if (console.group) console.group('i18n-tag-schema')
    const log = console[type] || console.log
    log(message)
    if (console.groupEnd) console.groupEnd()
  } else {
    const log = logger[type]
    if(log) log(message)
  }
}

/**
 * Info logging helper function
 * 
 * @param {Object} logger - The logger object.
 * @param {any} message - The message to log.
 */
export function logInfo(logger, message) {
  log(logger, message, 'info')
}

/**
 * Trace logging helper function
 * 
 * @param {Object} logger - The logger object.
 * @param {any} message - The message to log.
 */
export function logTrace(logger, message) {
  log(logger, message, 'trace')
}

/**
 * Debug logging helper function
 * 
 * @param {Object} logger - The logger object.
 * @param {any} message - The message to log.
 */
export function logDebug(logger, message) {
  log(logger, message, 'debug')
}

/**
 * Error logging helper function
 * 
 * @param {Object} logger - The logger object.
 * @param {string} message - The message to log.
 */
export function logError(logger, message) {
  log(logger, message, 'error')
}

/**
 * Warning logging helper function
 * 
 * @param {Object} logger - The logger object.
 * @param {string} message - The message to log.
 */
export function logWarn(logger, message) {
  log(logger, message, 'warn')
}