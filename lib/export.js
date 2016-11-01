import * as path from 'path'
import * as fs from 'fs'
import {logError, logInfo, logTrace, logWarn} from './logging'
import {parseFile} from './parser'

function pushIfNotExist(array, item) {
  if (array.indexOf(item) === -1) {
    array.push(item)
  }
}

export const readFileTemplates = (rootPath, filePath, templates, templatePatterns, contents, logger) => {
  try {
    const parsedTemplates = parseFile(contents)
    const newTemplates = parsedTemplates.templates
    const newTemplatePatterns = Object.assign(templatePatterns, parsedTemplates.templatePatterns)
    const { length } = newTemplates

    if (length) {
      const fileGroup = path.relative(rootPath, filePath).replace(/\\/g, '/')
      const groupedItems = { [fileGroup]: [] }
      const getOrCreateGroup = (name) => groupedItems[name] || (groupedItems[name] = [])
      const ungroupedTemplate = []
      newTemplates.forEach((t) => {
        if (t.group) {
          pushIfNotExist(getOrCreateGroup((t.group === '__translationGroup') ? fileGroup : t.group), t.value)
        } else {
          pushIfNotExist(ungroupedTemplate, t)
        }
      })
      ungroupedTemplate.forEach((item) => {
        pushIfNotExist(templates, item)
      })
      Object.keys(groupedItems).sort().forEach((g) => {
        const groupItems = groupedItems[g]
        if (groupItems && groupItems.length) {
          const grp = templates.find((item) => item.group === g)
          if (grp) {
            groupItems.forEach((item) => {
              pushIfNotExist(grp.items, item)
            })
            grp.items.sort()
          } else {
            templates.push({ group: g, items: groupItems.sort() })
          }
        }
      })
      templates.sort()
      logInfo(logger, `${path.relative(rootPath, filePath)} (${length} template${(length === 1) ? '' : 's'})`)
    } else {
      logInfo(logger, `${path.relative(rootPath, filePath)} (0 templates)`)
    }
    return { templates, templatePatterns: newTemplatePatterns }
  } catch (err) {
    logWarn(logger, `${filePath}: ${err.message}`)
    logTrace(logger, err)
  }
  return {}
}

/**
 * exportTranslationKeysFromFile exports all i18n tagged template literals in `srcPath`
 * 
 * @param {Object} options - The export options.
 * @param {string} options.rootPath - The root directory of your source files.
 * @param {string} options.filePath - The full path of the source file.
 * @param {requestCallback} options.callback - A callback function that will be called when the function completes.
 * @param {logger} [options.logger] - A custom logger.
 */
export const exportTranslationKeysFromFile = ({rootPath, filePath, callback, logger}) => {
  const templates = []
  const templatePatterns = {}
  fs.readFile(filePath, 'utf-8', (err, contents) => {
    if (err) {
      logError(logger, `${filePath}: ${err.messag}`)
      logTrace(logger, err)
      if(callback) callback(1, [])
    }
    const tmpls = readFileTemplates(rootPath, filePath, templates, templatePatterns, contents, logger)
    if(callback) callback(0, tmpls.templates || [])
  })
}