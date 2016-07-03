#!/usr/bin/env node
var program = require('commander');
var i18nTagSchema = require('../dist/lib').default;
var colors = require('colors');

program
    .version('0.0.1')
    .usage('<path> [options]')
    .option('-s, --schema <path>', 'set schema path. defaults to ./translation.schema.json')
    .option('-f, --filter <regex>', 'a regular expression to filter source files. defaults to \\\\.jsx?')
    .option('-g, --groups', 'group translations by module filenames')
    .action(function (path) {
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
                    break;
                case 'success':
                    console.log(colors.green(output));
                    break;
            }
        })
    })
    .parse(process.argv);

