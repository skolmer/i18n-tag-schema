import * as fs from "fs";
import * as path from "path";
import escapeStringRegexp from 'escape-string-regexp';
import walk from 'acorn-jsx-walk';

function log(callback, text, type) {
    if(callback) {
        callback(text, type)
    } else{
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
            default:
                console.log(text)
                break
        }
    }
}

function saveSchema(srcPath, templates, schema, callback) {
    if (templates && templates.length) {
        let json = JSON.parse(`{
            "type": "object",
            "properties": {
                ${templates.map(tmpl => `
                    ${JSON.stringify(tmpl)}: {
                        "type": "string"
                    }
                `)}
            },
            "additionalProperties": false
        }`);  
        
        if(schema) {              
            var prevJson
            if (fs.existsSync(schema)) {
                try {
                    prevJson = fs.readFileSync(schema, 'utf-8')
                } catch (err) {
                    log(callback, err.message, 'warn')
                }
            }
            fs.writeFile(schema, JSON.stringify(json, null, '\t'), 'utf-8', function (err) {
                if (err) {
                    log(callback, err.message, 'error')
                    return
                }

                var diff = jsonDiff(prevJson, json, callback)
                log(callback, `i18n json schema has been updated; contains ${Object.keys(json.properties).length} keys  ( ${diff.added.length} added / ${diff.removed.length} removed ): ${schema}`, 'info');
            })
        } else {
            log(callback, JSON.stringify(json, null, '\t'), 'info')
        }
    } else {
        if(schema) { 
            fs.writeFile(schema, JSON.stringify({}, null, '\t'), 'utf-8', function (err) {
                if (err) {
                    log(callback, err.message, 'error')
                    return
                }
                log(callback, `No i18n tagged template literals found in '${srcPath}'`, 'warn')
            });
        } else {
            log(callback, JSON.stringify({}, null, '\t'), 'info')
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
            let source = root;
            walk(source, {
                TaggedTemplateExpression: (node) => {
                    if (node.tag.name === 'i18n') {
                        let match = source.substring(node.quasi.start + 1, node.quasi.end - 1);
                        let count = 0;
                        node.quasi.expressions.forEach(exp => {
                            let expression = source.substring(exp.start, exp.end)
                            let expExpression = escapeStringRegexp(expression).replace(/\r/gm, '\\r').replace(/\n/gm, '\\n').replace(/\t/gm, '\\t').replace(/\s/gm, '\\s').replace(/"/gm, '\\"')
                            let regExp = new RegExp(`\\\${\\s*${expExpression}\\s*}(:([a-z])(\\((.+)\\))?)?`, "gm")
                            match = match.replace(regExp, `\${${count}}`)
                            count++
                            ev(expression)
                        });
                        templates.push(match.replace(/\r\n/g, '\n'));
                    }
                }
            });
        };
        ev(contents);
    }
    return templates
}

export default function(srcPath, filter, schema, callback) {
    let templates = [];
    let fileCount = 0, fileCountRead = 0;
    let readFiles = (dir) => fs.readdir(dir, (err, files) => {
        files.forEach((file) => {
            const filePath = path.resolve(dir, file)
            const ext = path.extname(file);
            if (ext.match(new RegExp(filter))) {
                fileCount++
                fs.readFile(filePath, 'utf-8', (err, contents) => {
                    templates.push(...inspectFile(contents))
                    fileCountRead++
                    if (fileCount === fileCountRead) {
                        saveSchema(srcPath, templates, schema, callback)
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