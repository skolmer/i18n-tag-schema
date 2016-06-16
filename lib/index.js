import * as fs from "fs";
import * as path from "path";
import escapeStringRegexp from 'escape-string-regexp';
import walk from 'acorn-jsx-walk';

function log(callback, text, type) {
    if(callback) {
        callback(text, type)
    } else{
        if(console.group) console.group('i18n-tag-schema')
        switch(type) {
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
        if(console.groupEnd) console.groupEnd()
    }
}

function saveSchema(srcPath, templates, schema, grouped, callback) {
    if (templates && templates.length) {
        const addTemplateProp = (tmpl) =>
        `${JSON.stringify(tmpl)}: {
            "type": "string"
        }`
        const jsonString = `{
            "type": "object",
            "properties": {
                ${templates.sort().map((tmpl) => (grouped) ? `${JSON.stringify(tmpl.group)}: { "type": "object", "properties": { ${tmpl.items.map(t => addTemplateProp(t))} } }` : addTemplateProp(tmpl)  )}
            },
            "additionalProperties": false
        }`
        const json = JSON.parse(jsonString);         
        
        if(schema) {              
            var prevJson
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

                var diff = jsonDiff(prevJson, json, callback)
                log(callback, `i18n json schema has been updated; contains ${Object.keys(json.properties).length} keys  ( ${diff.added.length} added / ${diff.removed.length} removed ): ${schema}`, 'success');
            })
        } else {
            log(callback, JSON.stringify(json, null, '\t'), 'success')
        }
    } else {
        if(schema) { 
            fs.writeFile(schema, JSON.stringify({}, null, '\t'), 'utf-8', function (err) {
                if (err) {
                    log(callback, err.message, 'error')
                    log(callback, err, 'trace')
                    return
                }
                log(callback, `No i18n tagged template literals found in '${srcPath}'`, 'success')
            });
        } else {
            log(callback, JSON.stringify({}, null, '\t'), 'success')
        }
    }
}

function jsonDiff(oldJson, newObj, callback) {
    if (oldJson) {
        try {
            let oldKeys = Object.keys(JSON.parse(oldJson).properties)
            let newKeys = Object.keys(newObj.properties)
            let removed = oldKeys.filter((value) => newKeys.indexOf(value) === -1)
            let added = newKeys.filter((value) => oldKeys.indexOf(value) === -1)
            return { removed, added };
        } catch (err) {
            log(callback, err.message, 'warn')
            log(callback, err, 'trace')
        }
    }
    return { removed: [], added: Object.keys(newObj.properties) }
}


function inspectFile(contents) {
    const templateRegEx = /i18n\s*`[^`]*`/g
    let matches = templateRegEx.exec(contents)
    let templates = []
    if (matches && matches.length) {
        let ev = (root) => {
            let source = root
            walk(source, {
                TaggedTemplateExpression: (node) => {
                    if (node.tag.name === 'i18n') {
                        let match = source.substring(node.quasi.start + 1, node.quasi.end - 1)
                        let count = 0;
                        node.quasi.expressions.forEach(exp => {
                            let expression = source.substring(exp.start, exp.end)
                            let expExpression = escapeStringRegexp(expression).replace(/\r/gm, '\\r').replace(/\n/gm, '\\n').replace(/\t/gm, '\\t').replace(/\s/gm, '\\s').replace(/"/gm, '\\"')
                            let regExp = new RegExp(`\\\${\\s*${expExpression}\\s*}(:([a-z])(\\((.+)\\))?)?`, "gm")
                            match = match.replace(regExp, `\${${count}}`)
                            count++
                            ev(expression)
                        });
                        let template = match.replace(/\r\n/g, '\n');
                        if(templates.indexOf(template) === -1) templates.push(template)
                    }
                }
            });
        };
        ev(contents);
    }
    return templates
}

export default function(srcPath, filter, schema, grouped, callback) {
    let templates = [];
    let fileCount = 0, fileCountRead = 0;
    let readFiles = (dir) => fs.readdir(dir, (err, files) => {
        if(err) {
            log(callback, err, 'error')
            return
        }
        files.forEach((file) => {
            const filePath = path.resolve(dir, file)
            const ext = path.extname(file);
            if (ext.match(new RegExp(filter))) {
                fileCount++
                fs.readFile(filePath, 'utf-8', (err, contents) => {
                    var newTemplates = inspectFile(contents).sort()
                    const { length } = newTemplates                   
                    
                    if(length) {
                        if(grouped) {
                            templates.push({ group: path.relative(srcPath, filePath).replace(/\\/g, '/'), items: [...newTemplates] })
                        } else {
                            templates.push(...newTemplates)
                        }
                        log(callback, `${path.relative(srcPath, filePath)} (${length} template${(length === 1)?'':'s'})`, 'info')
                    }
                    fileCountRead++
                    if (fileCount === fileCountRead) {
                        saveSchema(srcPath, templates, schema, grouped, callback)
                    }
                });
            }
            else {
                fs.stat(filePath, (err, stat) => {
                    if (stat && stat.isDirectory()) {
                        readFiles(filePath)
                    }
                });
            }
        });
    });

    readFiles(srcPath);
}