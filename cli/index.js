#!/usr/bin/env node
var program = require('commander');
var i18nTagSchemaModule = require('../dist/lib');
var i18nTagSchema = i18nTagSchemaModule.default;
var vaidateSchema = i18nTagSchemaModule.vaidateSchema;
var templatesFromFile = i18nTagSchemaModule.templatesFromFile;
var colors = require('colors');
var pathLib = require('path');
var fs = require('fs');

function formatResult(message) {
    var percentage = message.match(/(\d+)\s*%\s*translated/);
    if(percentage) {
        var val = Number.parseInt(percentage[1]);
        if(val < 50) {
            message = message.replace(percentage[0], colors.bgRed(colors.white(percentage[0])));            
        } else if(val < 100) {
            message = message.replace(percentage[0], colors.bgYellow(colors.black(percentage[0])));  
        }  else {
            message = message.replace(percentage[0], colors.bgGreen(colors.white(percentage[0]))); 
        }     
    }
    var missing = message.match(/(\d+)\s*missing/);
    if(missing) {
        var val = Number.parseInt(missing[1]);
        if(val === 0) {
            message = message.replace(missing[0], colors.bgGreen(colors.white(missing[0])));
        } else {
            message = message.replace(missing[0], colors.bgRed(colors.white(missing[0])));
        }
    }
    var invalid = message.match(/(\d+)\s*invalid/);
    if(invalid) {
        message = message.replace(invalid[0], colors.bgYellow(colors.black(percentage[0])));
    }
    return message;
}

program
    .version('0.0.1')
    .usage('<path> [options]')
    .option('-s, --schema <path>', 'set schema path. defaults to ./translation.schema.json')
    .option('-f, --filter <regex>', 'a regular expression to filter source files. defaults to \\.jsx?')
    .option('-g, --groups', 'group translations by module filenames')
    .option('-v, --validate', 'use to validate a translation file. path has to be a JSON file. requires --schema <path>')
    .option('-e, --export <path>', 'export all translation keys FROM this JavaScript file.')
    .option('-t, --target <path>', 'export all translation keys TO this JSON file. requires --export <path>')
    .action(function (path) {
        if(program.validate) {
            if(!program.schema) {
                console.log('  ' + colors.bgRed(colors.white('error:')) + ' ' +'option `--schema <path>` missing');
                process.exit(1);
            }
            if(pathLib.extname(path) !== '.json') {
                console.log('  ' + colors.bgRed(colors.white('error:')) + ' ' + path + ' is not a json file.');
                process.exit(1);
            }
            vaidateSchema(path, program.schema, (output, type) => {
                switch (type) {
                    case 'info':
                        console.log('  ' + colors.bgWhite(colors.black('info:')) + ' ' + output);
                        break;
                    case 'warn':
                        console.log('  ' + colors.bgYellow(colors.black('warn:')) + ' ' + output);
                        break;
                    case 'error':                        
                        console.log('  ' + colors.bgRed('X invalid:') + ' ' + formatResult(output));
                        process.exit(1);
                        break;
                    case 'success':
                        console.log('  ' + colors.bgGreen(colors.white('√ valid:')) + ' ' + formatResult(output));
                        break;
                }
            });
        } else if(program.export || program.filter) {
            if(program.export && !pathLib.extname(program.export).match(program.filter || '\\.jsx?')) {
                console.log('  ' + colors.bgRed(colors.white('error:')) + ' ' +program.export + ' is not a JavaScript file.');
                process.exit(1);
            }
            if(program.target && pathLib.extname(program.target) !== '.json') {
                console.log('  ' + colors.bgRed(colors.white('error:')) + ' ' +program.target + ' is not a json file.');
                process.exit(1);
            }
            templatesFromFile(path, program.export, program.groups,
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
                            console.log('  ' + colors.bgGreen(colors.white('success:')) + ' ' + output);
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
                        console.log('  ' + colors.bgGreen(colors.white('success:')) + ' Exported translation keys to ' + program.export);
                    });
                } else {
                    console.log(JSON.stringify(JSON.parse(templates), null, 2));
                }
            });
        } else {
            i18nTagSchema(path, program.filter || '\\.jsx?', program.schema || './translation.schema.json', program.groups, (output, type) => {
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
                        console.log('  ' + colors.bgGreen(colors.white('success:')) + ' ' + output);
                        break;
                }
            })
        }
    })
    .parse(process.argv);

