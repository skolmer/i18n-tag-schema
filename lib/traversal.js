import escapeStringRegexp from 'escape-string-regexp'
import traverse from 'babel-traverse'

const traverseTemplateExpressions = {
  TaggedTemplateExpression: (path, { source, templates, groupName, templatePatterns }) => {
    const node = path.node
    if (node.scanned) return
    node.scanned = true
    if (node.tag.name === 'i18n' || (node.tag.callee && (node.tag.callee.name === 'i18n' || (node.tag.callee.property && node.tag.callee.property.name === 'i18n'))) || (node.tag.property && node.tag.property.name === 'i18n')) {
      if (node.tag.arguments && node.tag.arguments.length) {
        groupName = node.tag.arguments[0].value || node.tag.arguments[0].name
      }
      let match = source.substring(node.quasi.start + 1, node.quasi.end - 1)
      let count = 0
      node.quasi.expressions.forEach((exp) => {
        const expression = source.substring(exp.start, exp.end)
        const expExpression = escapeStringRegexp(expression).replace(/\r/gm, '\\r').replace(/\n/gm, '\\n').replace(/\t/gm, '\\t').replace(/\s/gm, '\\s').replace(/"/gm, '\\"')
        const regExp = new RegExp(`\\\${\\s*${expExpression}\\s*}(:([a-z])(\\((.+)\\))?)?`, 'gm')
        match = match.replace(regExp, `\${${count}}`)
        count++
      })
      let template = match.replace(/\r\n/g, '\n')
      if (count) {
        let regex = ''
        for (let i = 0; i < count; i++) {
          regex += `(?=.*?\\\$\\\{${i}\\\})`
        }
        templatePatterns[template] = regex
      }
      if (groupName && !node.tag.name) {
        template = { group: groupName, value: template }
      }
      if (templates.indexOf(template) === -1 && templates.findIndex((t) => t.group && t.group === template.group && t.value && t.value === template.value) === -1) templates.push(template)
    }
  }
}

const traverseClassDeclarations = {
  ClassDeclaration: (path, { source, templates, groups, templatePatterns }) => {
    const node = path.node
    if (node.decorators && node.decorators.length) {
      const groupNames = node.decorators.map((d) => d.expression).filter((e) => e.callee && e.callee.name === 'i18nGroup' && e.arguments && e.arguments.length).map((d) => d.arguments.map((a) => a.name || a.value)).reduce((p, n) => p.concat(n), [])
      const groupName = (groupNames.length) ? groupNames[0] : null
      path.traverse(traverseTemplateExpressions, { source, templates, groupName, templatePatterns })
    } else {
      path.traverse(traverseTemplateExpressions, { source, templates, groupName: groups[node.id.name], templatePatterns })
    }
  }
}

const traverseExportDeclarations = {
  CallExpression: (path, { groups }) => {
    const node = path.node
    if (node.callee &&
      node.callee.type === 'CallExpression' &&
      node.callee.callee &&
      node.callee.callee.type === 'Identifier' &&
      node.callee.callee.name === 'i18nGroup' &&
      node.callee.arguments &&
      node.callee.arguments.length &&
      node.arguments &&
      node.arguments.length) {
      groups[node.arguments[0].name] = node.callee.arguments[0].name || node.callee.arguments[0].value
    }
  }
}

export const traverseAst = (ast, source, templates, templatePatterns) => {
  const groups = []
  traverse(ast, {
    Program: (path) => {
      path.traverse(traverseExportDeclarations, { source, templates, groups }) // find all i18nGroup calls
      path.traverse(traverseClassDeclarations, { source, templates, groups, templatePatterns }) // traverse classes first to get group decorators
      path.traverse(traverseTemplateExpressions, { source, templates, groupName: null, templatePatterns }) // traverse all template expressions
    }
  })
}