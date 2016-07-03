import * as fs from 'fs'
import * as path from 'path'
import escapeStringRegexp from 'escape-string-regexp'
import * as babylon from 'babylon'
import traverse from 'babel-traverse'

const schemaProperty = '$schema'

const babylonConfig = {
    sourceType: 'module',
    plugins: ['jsx',
        'asyncFunctions',
        'flow',
        'classConstructorCall',
        'doExpressions',
        'trailingFunctionCommas',
        'objectRestSpread',
        'decorators',
        'classProperties',
        'exportExtensions',
        'exponentiationOperator',
        'asyncGenerators',
        'functionBind',
        'functionSent'
    ]
}

function sortByKey(array, key) {
    return array.sort(function (a, b) {
        const x = a[key] || a, y = b[key] || b
        return ((x < y) ? -1 : ((x > y) ? 1 : 0))
    })
}

function log(callback, text, type) {
    if (callback) {
        callback(text, type)
    } else {
        if (console.group) console.group('i18n-tag-schema')
        switch (type) {
            case 'warn':
                console.warn(text)
                break
            case 'error':
                console.error(text)
                break
            case 'info':
                console.info(text)
                break
            case 'debug':
                console.debug(text)
                break
            case 'trace':
                console.trace(text)
                break
            default:
                console.log(text)
                break
        }
        if (console.groupEnd) console.groupEnd()
    }
}

function saveSchema(srcPath, filter, templates, schema, grouped, callback) {
    if (templates && templates.length) {
        const addTemplateProp = (tmpl) =>
            `${JSON.stringify(tmpl)}: {
            "type": "string"
        }`
        const addTemplateGroup = (tmpl) =>
            `${JSON.stringify(tmpl.group)}: { 
            "type": "object", 
            "properties": { 
                ${tmpl.items.map((t) => addTemplateProp(t))} 
            } 
        }`
        const jsonString = (grouped) ?
            `{
                "type": "object",
                "properties": {
                    "${schemaProperty}": {
                        "type": "string"
                    },
                    ${templates.map((tmpl) => addTemplateGroup(tmpl))}
                },
                "additionalProperties": false
            }`
            :
            `{
                "definitions": {
                    "translations": {
                        "type": "object",
                        "properties": {
                            "${schemaProperty}": {
                                "type": "string"
                            },
                            ${templates.map((tmpl) => (tmpl.group) ? addTemplateGroup(tmpl) : addTemplateProp(tmpl))}
                        },
                        "additionalProperties": false			
                    },
                    "group": {
                        "type": "object",
                        "properties": {
                            "${schemaProperty}": {
                                "type": "string"
                            }
                        },
                        "patternProperties": {
                            "^([^/]+(/|${JSON.stringify(filter).match(/^"(.*)"$/)[1]}))+$": {
                                "$ref": "#/definitions/translations"
                            }
                        },
                        "additionalProperties": false	
                    }
                },
                "type": "object",
                "oneOf": [
                    { "$ref": "#/definitions/translations" },
                    { "$ref": "#/definitions/group"	}				
                ]	
            }`

        const json = JSON.parse(jsonString)

        if (schema) {
            let prevJson
            if (fs.existsSync(schema)) {
                try {
                    prevJson = fs.readFileSync(schema, 'utf-8')
                } catch (err) {
                    log(callback, err.message, 'warn')
                    log(callback, err, 'trace')
                }
            }
            fs.writeFile(schema, JSON.stringify(json, null, '\t'), 'utf-8', function (err) {
                if (err) {
                    log(callback, err.message, 'error')
                    log(callback, err, 'trace')
                    return
                }

                const diff = jsonDiff(prevJson, json, callback)
                log(callback, `i18n json schema has been updated; contains ${diff.count} keys  ( ${diff.added.length} added / ${diff.removed.length} removed ): ${schema}`, 'success')
            })
        } else {
            log(callback, JSON.stringify(json, null, '\t'), 'success')
        }
    } else {
        if (schema) {
            fs.writeFile(schema, JSON.stringify({}, null, '\t'), 'utf-8', function (err) {
                if (err) {
                    log(callback, err.message, 'error')
                    log(callback, err, 'trace')
                    return
                }
                log(callback, `No i18n tagged template literals found in '${srcPath}'`, 'success')
            })
        } else {
            log(callback, JSON.stringify({}, null, '\t'), 'success')
        }
    }
}

function jsonDiff(oldJson, newObj, callback) {
    if (oldJson) {
        try {
            const buildStats = () => {
                oldKeys = oldKeys.filter((name) => name !== schemaProperty)
                newKeys = newKeys.filter((name) => name !== schemaProperty)
                const count = newKeys.length
                const removed = oldKeys.filter((value) => newKeys.indexOf(value) === -1)
                const added = newKeys.filter((value) => oldKeys.indexOf(value) === -1)
                return { removed, added, count }
            }
            const lookupKeys = (obj) => {
                let keys = []
                if (obj.definitions && obj.definitions.translations && obj.definitions.translations.properties) {
                    keys = Object.keys(obj.definitions.translations.properties)
                } else if (obj.properties) {
                    keys = Object.keys(obj.properties).map((key) => {
                        const prop = obj.properties[key]
                        if (prop.properties) {
                            return Object.keys(prop.properties).map((keyB) => keyB)
                        } else {
                            return []
                        }
                    }).reduce(function (a, b) {
                        return a.concat(b)
                    }, [])
                }
                return keys
            }
            const oldObj = JSON.parse(oldJson)
            let oldKeys = lookupKeys(oldObj)
            let newKeys = lookupKeys(newObj)
            return buildStats()
        } catch (err) {
            log(callback, err.message, 'warn')
            log(callback, err, 'trace')
        }
    }
    let newKeys = Object.keys(newObj.properties || newObj.definitions.translations.properties || {})
    newKeys = newKeys.filter((name) => name !== schemaProperty)
    return { removed: [], added: newKeys, count: newKeys.length }
}

const traverseTemplateExpressions = {
    TaggedTemplateExpression: (path, { source, templates, groupName }) => {
        const node = path.node
        if (node.scanned) return
        node.scanned = true
        if (node.tag.name === 'i18n' || (node.tag.callee && (node.tag.callee.name === 'i18n' || (node.tag.callee.property && node.tag.callee.property.name === 'i18n'))) || (node.tag.property && node.tag.property.name === 'i18n')) {
            if(node.tag.arguments && node.tag.arguments.length) {
                groupName = node.tag.arguments[0].value
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
            if (groupName) {
                template = { group: groupName, value: template }
            }
            if (templates.indexOf(template) === -1) templates.push(template)
        }
    }
}

const traverseClassDeclarations = {
    ClassDeclaration: (path, { source, templates, groups }) => {
        const node = path.node
        if (node.decorators && node.decorators.length) {
            const groupNames = node.decorators.map((d) => d.expression).filter((e) => e.callee && e.callee.name === 'i18nGroup' && e.arguments && e.arguments.length).map((d) => d.arguments.map(a => a.value)).reduce((p, n) => p.concat(n), [])
            const groupName = (groupNames.length) ? groupNames[0] : null
            path.traverse(traverseTemplateExpressions, { source, templates, groupName })
        } else {
            path.traverse(traverseTemplateExpressions, { source, templates, groupName: groups[node.id.name] })
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
            groups[node.arguments[0].name] = node.callee.arguments[0].value
        }
    }
}


function inspectFile(contents) {
    const templateRegEx = /i18n(?:\(.*?\))?\s*`[^`]*`/g
    const matches = templateRegEx.exec(contents)
    const templates = []
    const groups = []
    if (matches && matches.length) {
        const ev = (source) => {
            const ast = babylon.parse(source, babylonConfig)
            traverse(ast, {
                Program: (path) => {
                    path.traverse(traverseExportDeclarations, { source, templates, groups }) // find all i18nGroup calls
                    path.traverse(traverseClassDeclarations, { source, templates, groups }) // traverse classes first to get group decorators
                    path.traverse(traverseTemplateExpressions, { source, templates }) // traverse all template expressions
                }
            })
        }
        ev(contents)
    }
    return templates
}

export default function (srcPath, filter, schema, grouped, callback) {
    const templates = []
    const filterRegexp = new RegExp(filter)
    let fileCount = 0, fileCountRead = 0
    const readFiles = (dir) => fs.readdir(dir, (err, files) => {
        if (err) {
            log(callback, err, 'error')
            return
        }
        files.forEach((file) => {
            const filePath = path.resolve(dir, file)
            if (file.match(filterRegexp)) {
                fileCount++
                fs.readFile(filePath, 'utf-8', (err, contents) => {
                    try {
                        const newTemplates = inspectFile(contents)
                        const { length } = newTemplates

                        if (length) {
                            const fileGroup = path.relative(srcPath, filePath).replace(/\\/g, '/')
                            const groupedItems = { [fileGroup]: [] }
                            const getOrCreateGroup = (name) => groupedItems[name] || (groupedItems[name] = [])
                            const ungroupedTemplate = []
                            newTemplates.forEach((t) => {
                                if (t.group) {
                                    getOrCreateGroup(t.group).push(t.value)
                                } else {
                                    (grouped) ? getOrCreateGroup(fileGroup).push(t) : ungroupedTemplate.push(t)
                                }
                            })
                            templates.push(...ungroupedTemplate.sort())
                            Object.keys(groupedItems).sort().forEach((g) => {
                                const groupItems = groupedItems[g]
                                if (groupItems && groupItems.length) {
                                    templates.push({ group: g, items: groupItems.sort() })
                                }
                            })
                            log(callback, `${path.relative(srcPath, filePath)} (${length} template${(length === 1) ? '' : 's'})`, 'info')
                        }
                    } catch (err) {
                        log(callback, `${filePath}: ${err.message}`, 'warn')
                        log(callback, `${filePath}: ${err}`, 'trace')
                    }
                    fileCountRead++
                    if (fileCount === fileCountRead) {
                        saveSchema(srcPath, filter, sortByKey(templates, 'group'), schema, grouped, callback)
                    }
                })
            }
            else {
                fs.stat(filePath, (err, stat) => {
                    if (stat && stat.isDirectory()) {
                        readFiles(filePath)
                    }
                })
            }
        })
    })

    readFiles(srcPath)
}