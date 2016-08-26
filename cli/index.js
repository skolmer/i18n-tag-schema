#!/usr/bin/env node
var program = require('commander');
var i18nTagSchemaModule = require('../dist/lib');
var i18nTagSchema = i18nTagSchemaModule.default;
var validateSchema = i18nTagSchemaModule.validateSchema;
var exportTranslationKeys = i18nTagSchemaModule.exportTranslationKeys;
var colors = require('colors');
var pathLib = require('path');
var fs = require('fs');

function formatResult(message) {
    message = message.replace(/(\d+)\s*%\s*translated/g, (str, value) => {
        var val = Number.parseInt(value);
        if(val < 50) {
            return colors.bgRed(colors.white(str));            
        } else if(val < 100) {
            return colors.bgYellow(colors.black(str));  
        }  else {
            return colors.bgGreen(colors.black(str)); 
        }
    });
    message = message.replace(/(\d+)\s*keys/g, (str) => {
        return colors.bgWhite(colors.black(str));
    });
    message = message.replace(/(\d+)\s*added/g, (str) => {
        return colors.bgGreen(colors.black(str));
    });
    message = message.replace(/(\d+)\s*removed/g, (str) => {
        return colors.bgRed(colors.white(str));
    });
    message = message.replace(/(\d+)\s*missing/g, (str, value) => {
        var val = Number.parseInt(value);
        if(val === 0) {
            return colors.bgGreen(colors.black(str));
        } else {
            return colors.bgRed(colors.white(str));
        }
    });
    message = message.replace(/(\d+)\s*invalid/g, (str) => {
        return colors.bgYellow(colors.black(str));
    });
    message = message.replace(/\n/g, () => {
        return '\n    ';
    });
    return message;
}

program
    .version('0.0.1')
    .usage('<path> [options]')
    .option('-s, --schema <path>', 'set schema path. defaults to ./translation.schema.json')
    .option('-f, --filter <regex>', 'a regular expression to filter source files. defaults to \\.jsx?$')
    .option('-v, --validate', 'use to validate translation file(s). path has to be a JSON file or directory. requires --schema <path>')
    .option('-e, --export <path>', 'export all translation keys FROM a JavaScript file or directory.')
    .option('-t, --target <path>', 'export all translation keys TO a JSON file. requires --export <path>.\n                      If --target is not set, JSON will be printed to the output.')
    .action(function (path) {
        if(program.validate) {
            if(!program.schema) {
                console.log('  ' + colors.bgRed(colors.white('error:')) + ' ' +'option `--schema <path>` missing');
                process.exit(1);
            }
            validateSchema(path, program.schema, (output, type) => {
                switch (type) {
                    case 'info':
                        console.log('  ' + colors.bgWhite(colors.black('info:')) + ' ' + output);
                        break;
                    case 'warn':
                        console.log('  ' + colors.bgYellow(colors.black('warn:')) + ' ' + output);
                        break;
                    case 'error':     
                        console.log('');               
                        console.log('  ' + colors.red('X') + ' invalid: ' + formatResult(output));
                        process.exit(1);
                        break;
                    case 'success':
                        console.log('');
                        console.log('  ' + colors.green('√') + ' valid: ' + formatResult(output));
                        break;
                }
            });
        } else if(program.export || program.filter) {
            if(program.export && (pathLib.extname(program.export) && !pathLib.extname(program.export).match(program.filter || '\\.jsx?$'))) {
                console.log('  ' + colors.bgRed(colors.white('error:')) + ' ' +program.export + ' is not a JavaScript file.');
                process.exit(1);
            }
            if(program.target && pathLib.extname(program.target) !== '.json') {
                console.log('  ' + colors.bgRed(colors.white('error:')) + ' ' +program.target + ' is not a json file.');
                process.exit(1);
            }
            exportTranslationKeys(path, program.export,
            (output, type) => {
                if(program.target) {
                    switch (type) {
                        case 'info':
                            console.log('  ' + colors.bgWhite(colors.black('info:')) + ' ' + output);
                            break;
                        case 'warn':
                            console.log('  ' + colors.bgYellow(colors.black('warn:')) + ' ' + output);
                            break;
                        case 'error':
                            console.log('  ' + colors.bgRed(colors.white('error:')) + ' ' + output);
                            process.exit(1);
                            break;
                        case 'success':
                            console.log('  ' + colors.bgGreen(colors.black('success:')) + ' ' + output);
                            break;
                    }
                }
            },
            (templates) => {
                if(program.target) {
                    fs.writeFile(program.target, JSON.stringify(JSON.parse(templates), null, 2), 'utf-8', function (err) {
                        if (err) {
                            console.log('  ' + colors.bgRed(colors.white('error:')) + ' ' + err.message);
                            process.exit(1);
                            return;
                        }
                        console.log('  ' + colors.bgGreen(colors.black('success:')) + ' Exported translation keys to ' + program.target);
                    });
                } else {
                    console.log(JSON.stringify(JSON.parse(templates), null, 2));
                }
            });
        } else {
            i18nTagSchema(path, program.filter || '\\.jsx?$', program.schema || './translation.schema.json', (output, type) => {
                switch (type) {
                    case 'info':
                        console.log('  ' + colors.bgWhite(colors.black('info:')) + ' ' + output);
                        break;
                    case 'warn':
                        console.log('  ' + colors.bgYellow(colors.black('warn:')) + ' ' + output);
                        break;
                    case 'error':
                        console.log('  ' + colors.bgRed(colors.white('error:')) + ' ' + output);
                        process.exit(1);
                        break;
                    case 'success':
                        console.log('  ' + colors.bgGreen(colors.black('success:')) + ' ' + formatResult(output));
                        break;
                }
            })
        }
    })
    .parse(process.argv);
