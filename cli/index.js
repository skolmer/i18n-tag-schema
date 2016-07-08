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
    .option('-e, --export <path>', 'export all translation keys from this JavaScript file. requires --target <path> and --schema <path>')
    .option('-t, --target <path>', 'export all translation keys to this JSON file. requires --export <path> --schema <path>')
    .action(function (path) {
        if(program.validate) {
            if(!program.schema) {
                console.log(colors.red('--schema <path> option is missing'));
                process.exit(1);
            }
            if(pathLib.extname(path) !== '.json') {
                console.log(colors.red(path + ' is not a json file.'));
                process.exit(1);
            }
            vaidateSchema(path, program.schema, (output, type) => {
                switch (type) {
                    case 'info':
                        console.log('INFO: ' + output);
                        break;
                    case 'warn':
                        console.log(colors.yellow('WARN: ' + output));
                        break;
                    case 'error':
                        console.log(colors.red('ERROR: ' + output));
                        process.exit(1);
                        break;
                    case 'success':
                        console.log(colors.green('SUCCESS: ' + output));
                        break;
                }
            });
        } else if(program.export || program.filter) {
            if(!program.schema) {
                console.log(colors.red('--schema <path> option is missing'));
                process.exit(1);
            }
            if(program.export && !pathLib.extname(program.export).match(program.filter || '\\.jsx?')) {
                console.log(colors.red(program.export + ' is not a JavaScript file.'));
                process.exit(1);
            }
            if(program.target && pathLib.extname(program.target) !== '.json') {
                console.log(colors.red(program.target + ' is not a json file.'));
                process.exit(1);
            }
            templatesFromFile(path, program.export, program.groups,
            (output, type) => {
                if(program.target) {
                    switch (type) {
                        case 'info':
                            console.log('INFO: ' + output);
                            break;
                        case 'warn':
                            console.log(colors.yellow('WARN: ' + output));
                            break;
                        case 'error':
                            console.log(colors.red('ERROR: ' + output));
                            process.exit(1);
                            break;
                        case 'success':
                            console.log(colors.green('SUCCESS: ' + output));
                            break;
                    }
                }
            },
            (templates) => {
                if(program.target) {
                    fs.writeFile(program.target, JSON.stringify(JSON.parse(templates), null, 2), 'utf-8', function (err) {
                        if (err) {
                            console.log(colors.red('ERROR: ' + err.message));
                            process.exit(1);
                            return;
                        }
                        console.log(colors.green('SUCCESS: Exported translation keys to ' + program.export));
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

