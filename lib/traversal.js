import escapeStringRegexp from 'escape-string-regexp'
import traverse from 'babel-traverse'

const addTemplateIfNotExist = (templates, groupName, template) => {
  let temp = template
  if(groupName) temp = { group: groupName, value: template }
  if (templates.indexOf(template) === -1 && templates.findIndex((t) => t.group && t.group === temp.group && t.value && t.value === temp.value) === -1) {
    templates.push(temp)
    return true
  }
  return false
}

const getRegexFromTranslationKey = (template) => {
  const regexp = /\${(\d+)}/g
  let expressions = regexp.exec(template)
  let regex = ''
  while (expressions != null) {
    if(expressions.length > 1) {
      regex += `(?=.*?\\$\\{${expressions[1]}\\})`
      expressions = regexp.exec(template)
    }
  }
  return regex
}

const traverseTemplateExpressions = {
  TaggedTemplateExpression: (path, { source, templates, groupName, templatePatterns, importNames }) => {
    const node = path.node
    if (node.scanned) return
    node.scanned = true
    if (node.tag.name === importNames.i18n || (node.tag.callee && (node.tag.callee.name === importNames.i18n || (node.tag.callee.property && node.tag.callee.property.name === 'i18n'))) || (node.tag.property && node.tag.property.name === 'i18n')) {
      if (node.tag.arguments && node.tag.arguments.length) {
        groupName = node.tag.arguments[0].value || node.tag.arguments[0].name
      }
      let match = source.substring(node.quasi.start + 1, node.quasi.end - 1)
      let count = 0
      node.quasi.expressions.forEach((exp) => {
        const expression = source.substring(exp.start, exp.end)
        const expExpression = escapeStringRegexp(expression).replace(/\r/gm, '\\r').replace(/\n/gm, '\\n').replace(/\t/gm, '\\t').replace(/\s/gm, '\\s').replace(/"/gm, '\\"')
        const regExp = new RegExp(`\\\${\\s*${expExpression}\\s*}(:([a-z])(\\(([^\\)]+)\\))?)?`, 'm')
        match = match.replace(regExp, `\${${count}}`)
        count++
      })
      const template = match.replace(/\r\n/g, '\n')
      if(template) {
        if(addTemplateIfNotExist(templates, (node.tag.name)?null:groupName, template)) {
          if (count) {
            let regex = ''
            for (let i = 0; i < count; i++) {
              regex += `(?=.*?\\$\\{${i}\\})`
            }
            templatePatterns[template] = regex
          }
        }
      }
    }
  }
}

const traverseImportDeclarations = {
  ImportDeclaration: (path, { importNames }) => {
    const node = path.node
    if (node.source &&
    node.source.value &&
    node.source.value.indexOf('es2015-i18n-tag') > -1 &&
    node.specifiers) {
      node.specifiers.forEach((spec) => {
        if(spec.type === 'ImportDefaultSpecifier' && spec.local && spec.local.name !== importNames.i18n) {
          importNames.i18n = spec.local.name
        } else if(spec.type === 'ImportSpecifier' && spec.local && spec.imported && spec.imported.name === 'i18nGroup' && spec.local.name !== importNames.i18nGroup) {
          importNames.i18nGroup = spec.local.name
        }
      })
    }
  }
}

const traverseClassDeclarations = {
  ClassDeclaration: (path, { source, templates, groups, templatePatterns, importNames }) => {
    const node = path.node
    if (node.decorators && node.decorators.length) {
      const groupNames = node.decorators.map((d) => d.expression).filter((e) => e.callee && e.callee.name === importNames.i18nGroup && e.arguments && e.arguments.length).map((d) => d.arguments[0].name || d.arguments[0].value).filter((a) => !!a)
      const groupName = (groupNames.length) ? groupNames[0] : null
      path.traverse(traverseTemplateExpressions, { source, templates, groupName, templatePatterns, importNames })
      path.traverse(traverseTranslateCallExpressions, { templates, groupName, templatePatterns, importNames })
    } else {
      path.traverse(traverseTemplateExpressions, { source, templates, groupName: groups[node.id.name], templatePatterns, importNames })
      path.traverse(traverseTranslateCallExpressions, { templates, groupName: groups[node.id.name], templatePatterns, importNames })
    }
  }
}

const traverseExportDeclarations = {
  CallExpression: (path, { groups, importNames }) => {
    const node = path.node
    if (node.callee &&
      node.callee.type === 'CallExpression' &&
      node.callee.callee &&
      node.callee.callee.type === 'Identifier' &&
      node.callee.callee.name === importNames.i18nGroup &&
      node.callee.arguments &&
      node.callee.arguments.length &&
      node.arguments &&
      node.arguments.length) {
      groups[node.arguments[0].name] = node.callee.arguments[0].name || node.callee.arguments[0].value
    }
  }
}

const traverseTranslateCallExpressions = {
  CallExpression: (path, { templates, groupName, templatePatterns, importNames }) => {
    const node = path.node
    if (node.scanned) return
    node.scanned = true
    if(node.callee &&
      node.callee.type === 'MemberExpression' &&
      node.callee.object &&
      (
        (node.callee.object.type === 'Identifier' &&
        node.callee.object.name === importNames.i18n) ||
        (node.callee.object.type === 'CallExpression' &&
        node.callee.object.callee.type === 'Identifier' &&
        node.callee.object.callee.name === importNames.i18n) ||
        (node.callee.object.type === 'MemberExpression' &&
        node.callee.object.property &&
        node.callee.object.property.type === 'Identifier' &&
        node.callee.object.property.name === 'i18n' &&
        node.callee.object.object &&
        node.callee.object.object.type === 'ThisExpression')
      ) &&
      node.callee.property &&
      node.callee.property.type === 'Identifier' &&
      node.callee.property.name === 'translate' &&
      node.arguments &&
      node.arguments.length
    ) {
        let group = groupName
        if(node.callee.object.arguments && node.callee.object.arguments.length) {
          group = node.callee.object.arguments[0].name || node.callee.object.arguments[0].value
        }
        if(node.arguments[0].type === 'Identifier' &&
          node.arguments[0].trailingComments &&
          node.arguments[0].trailingComments.length &&
          node.arguments[0].trailingComments[0].value
        ) {
          const comment = node.arguments[0].trailingComments[0].value.trim()
          try {
            const value = JSON.parse(comment)
            if(Array.isArray(value)) {
              for(const val of value) {
                if(addTemplateIfNotExist(templates, group, val)) {
                  const regex = getRegexFromTranslationKey(val)
                  if(regex) {
                    templatePatterns[val] = regex
                  }
                }
              }
            } else {
              if(addTemplateIfNotExist(templates, group, value)) {
                const regex = getRegexFromTranslationKey(value)
                if(regex) {
                  templatePatterns[value] = regex
                }
              }
            }
          }
          catch(err) {
            // comment cannot be parsed, ignore
          }
        }
        else if(node.arguments[0].type === 'StringLiteral' &&
          node.arguments[0].value
        ) {
          const template = node.arguments[0].value
          if(addTemplateIfNotExist(templates, group, template)) {
            const regex = getRegexFromTranslationKey(template)
            if(regex) {
              templatePatterns[template] = regex
            }
          }
        }
      }
  }
}

export const traverseAst = (ast, source, templates, templatePatterns) => {
  const groups = []
  traverse(ast, {
    Program: (path) => {
      const importNames = { i18n: 'i18n', i18nGroup: 'i18nGroup'}
      path.traverse(traverseImportDeclarations, { importNames })
      path.traverse(traverseExportDeclarations, { groups, importNames }) // find all i18nGroup calls
      path.traverse(traverseClassDeclarations, { source, templates, groups, templatePatterns, importNames }) // traverse classes first to get group decorators
      path.traverse(traverseTemplateExpressions, { source, templates, groupName: null, templatePatterns, importNames }) // traverse all template expressions
      path.traverse(traverseTranslateCallExpressions, { templates, groupName: null, templatePatterns, importNames }) // traverse all translate calls
    }
  })
}