#!/usr/bin/env node
var program = require('commander');
var i18nTagSchemaModule = require('../dist/lib');
var i18nTagSchema = i18nTagSchemaModule.default;
var vaidateSchema = i18nTagSchemaModule.vaidateSchema;
var templatesFromFile = i18nTagSchemaModule.templatesFromFile;
var colors = require('colors');
var pathLib = require('path');
var fs = require('fs');

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
                console.log('  error: option `--schema <path>` missing');
                process.exit(1);
            }
            if(pathLib.extname(path) !== '.json') {
                console.log('  error: ' + path + ' is not a json file.');
                process.exit(1);
            }
            vaidateSchema(path, program.schema, (output, type) => {
                switch (type) {
                    case 'info':
                        console.log('  info: ' + output);
                        break;
                    case 'warn':
                        console.log(colors.yellow('  warn: ' + output));
                        break;
                    case 'error':
                        console.log(colors.red('  error: ' + output));
                        process.exit(1);
                        break;
                    case 'success':
                        console.log(colors.green('  success: ' + output));
                        break;
                }
            });
        } else if(program.export || program.filter) {
            if(program.export && !pathLib.extname(program.export).match(program.filter || '\\.jsx?')) {
                console.log('  error: ' + program.export + ' is not a JavaScript file.');
                process.exit(1);
            }
            if(program.target && pathLib.extname(program.target) !== '.json') {
                console.log('  error: ' + program.target + ' is not a json file.');
                process.exit(1);
            }
            templatesFromFile(path, program.export, program.groups,
            (output, type) => {
                if(program.target) {
                    switch (type) {
                        case 'info':
                            console.log('  info: ' + output);
                            break;
                        case 'warn':
                            console.log(colors.yellow('  warn: ' + output));
                            break;
                        case 'error':
                            console.log(colors.red('  error: ' + output));
                            process.exit(1);
                            break;
                        case 'success':
                            console.log(colors.green('  success: ' + output));
                            break;
                    }
                }
            },
            (templates) => {
                if(program.target) {
                    fs.writeFile(program.target, JSON.stringify(JSON.parse(templates), null, 2), 'utf-8', function (err) {
                        if (err) {
                            console.log(colors.red('  error: ' + err.message));
                            process.exit(1);
                            return;
                        }
                        console.log(colors.green('  success: Exported translation keys to ' + program.export));
                    });
                } else {
                    console.log(JSON.stringify(JSON.parse(templates), null, 2));
                }
            });
        } else {
            i18nTagSchema(path, program.filter || '\\.jsx?', program.schema || './translation.schema.json', program.groups, (output, type) => {
                switch (type) {
                    case 'info':
                        console.log(output);
                        break;
                    case 'warn':
                        console.log(colors.yellow(output));
                        break;
                    case 'error':
                        console.log(colors.red(output));
                        process.exit(1);
                        break;
                    case 'success':
                        console.log(colors.green(output));
                        break;
                }
            })
        }
    })
    .parse(process.argv);

