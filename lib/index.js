import * as fs from "fs"
import * as path from "path"
import escapeStringRegexp from 'escape-string-regexp'
import walk from 'acorn-jsx-walk'

const schemaProperty = '$schema'

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
        const jsonString = (grouped) ?
            `{
            "type": "object",
            "properties": {
                "$schema": {
                    "type": "string"
                },
                ${templates.sort().map((tmpl) => `${JSON.stringify(tmpl.group)}: { "type": "object", "properties": { ${tmpl.items.map(t => addTemplateProp(t))} } }`)}
            },
            "additionalProperties": false
        }`
            :
            `{
            "definitions": {
                "translations": {
                    "type": "object",
                    "properties": {
                        "$schema": {
                            "type": "string"
                        },
                        ${templates.sort().map((tmpl) => addTemplateProp(tmpl))}
                    },
                    "additionalProperties": false			
                },
                "group": {
                    "type": "object",
                    "properties": {
                        "$schema": {
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


function inspectFile(contents) {
    const templateRegEx = /i18n(?:\(.*?\))?\s*`[^`]*`/g
    const matches = templateRegEx.exec(contents)
    const templates = []
    if (matches && matches.length) {
        const ev = (root) => {
            walk(root, {
                TaggedTemplateExpression: (node) => {
                    if (node.tag.name === 'i18n' || (node.tag.callee && node.tag.callee.name === 'i18n')) {
                        let match = root.substring(node.quasi.start + 1, node.quasi.end - 1)
                        let count = 0
                        node.quasi.expressions.forEach(exp => {
                            const expression = root.substring(exp.start, exp.end)
                            const expExpression = escapeStringRegexp(expression).replace(/\r/gm, '\\r').replace(/\n/gm, '\\n').replace(/\t/gm, '\\t').replace(/\s/gm, '\\s').replace(/"/gm, '\\"')
                            const regExp = new RegExp(`\\\${\\s*${expExpression}\\s*}(:([a-z])(\\((.+)\\))?)?`, "gm")
                            match = match.replace(regExp, `\${${count}}`)
                            count++
                            ev(expression)
                        })
                        const template = match.replace(/\r\n/g, '\n')
                        if (templates.indexOf(template) === -1) templates.push(template)
                    }
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
                            if (grouped) {
                                templates.push({ group: path.relative(srcPath, filePath).replace(/\\/g, '/'), items: [...newTemplates.sort()] })
                            } else {
                                templates.push(...newTemplates)
                            }
                            log(callback, `${path.relative(srcPath, filePath)} (${length} template${(length === 1) ? '' : 's'})`, 'info')
                        }                        
                    } catch (err) {
                        log(callback, `${filePath}: ${err.message}`, 'warn')
                        log(callback, `${filePath}: ${err}`, 'trace')
                    }
                    fileCountRead++
                    if (fileCount === fileCountRead) {
                        saveSchema(srcPath, filter, templates, schema, grouped, callback)
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