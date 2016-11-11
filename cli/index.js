#!/usr/bin/env node
var program = require('commander');
var i18nTagSchemaModule = require('../dist/lib');
var generateTranslationSchema = i18nTagSchemaModule.generateTranslationSchema;
var validateTranslations = i18nTagSchemaModule.validateTranslations;
var exportTranslationKeys = i18nTagSchemaModule.exportTranslationKeys;
var chalk = require('chalk');
var pathLib = require('path');
var fs = require('fs');
var ProgressBar = require('progress')

const isWin32 = process.platform === 'win32';
const errorSymbol = isWin32 ? '×' : '✖';
const successSymbol = isWin32 ? '√' : '✔';
const progressComplete = isWin32 ? chalk.green('#') : chalk.green.inverse(' ');
const progressIncomplete = isWin32 ? chalk.white(' ') : chalk.white.inverse(' ')

let log = []

const logger = {
  clear: () => log = [],
  info: (message) => log.push('  ' + chalk.bgWhite(chalk.black(' INFO ')) + ' ' + message),
  warn: (message) => log.push('  ' + chalk.bgYellow(chalk.black(' WARN ')) + ' ' + message),
  error: (message) => log.push('  ' + chalk.bgRed(chalk.white(' ERROR ')) + ' ' + message),
  flush: () => console.log('') || log.forEach((message) => console.log(message))
}

const progressBar = () => {
  let progress
  return (current, total, name) => {
    if(!progress) {
      progress = new ProgressBar(':bar :percent :etas  :name', { total: total, complete: progressComplete, incomplete: progressIncomplete, width: 20 });
    } else {
      progress.update(current / total, {
        name: name
      })
    }
  }
}

function formatResult(message) {
  message = message.replace(/(\d+)\s*%\s*translated/g, (str, value) => {
    var val = Number.parseInt(value);
    if (val < 50) {
      return chalk.bgRed(chalk.white(str));
    } else if (val < 100) {
      return chalk.bgYellow(chalk.black(str));
    } else {
      return chalk.bgGreen(chalk.black(str));
    }
  });
  message = message.replace(/(\d+)\s*keys/g, (str) => {
    return chalk.bgWhite(chalk.black(str));
  });
  message = message.replace(/(\d+)\s*added/g, (str) => {
    return chalk.bgGreen(chalk.black(str));
  });
  message = message.replace(/(\d+)\s*removed/g, (str) => {
    return chalk.bgRed(chalk.white(str));
  });
  message = message.replace(/(\d+)\s*missing/g, (str, value) => {
    var val = Number.parseInt(value);
    if (val === 0) {
      return chalk.bgGreen(chalk.black(str));
    } else {
      return chalk.bgRed(chalk.white(str));
    }
  });
  message = message.replace(/(\d+)\s*invalid/g, (str) => {
    return chalk.bgYellow(chalk.black(str));
  });
  message = message.replace(/\n/g, () => {
    return '\n    ';
  });
  return message;
}

program
  .version('2.0.0')
  .usage('<path> [options]')
  .option('-p, --preprocessor <name>', 'the name of a preprocessor node module. for typescript use \'./preprocessors/typescript\'')
  .option('-s, --schema <path>', 'set path of the schema to create or validate against.\n                      If --schema is not set, JSON will be printed to the output.')
  .option('-f, --filter <regex>', 'a regular expression to filter source files. defaults to \\.jsx?$')
  .option('-v, --validate', 'use to validate translation file(s). path has to be a JSON file or directory. requires --schema <path>')
  .option('-e, --export <path>', 'export all translation keys FROM a JavaScript file or directory.')
  .option('-t, --target <path>', 'export all translation keys TO a JSON file. requires --export <path>.\n                      If --target is not set, JSON will be printed to the output.')
  .action(function (path) {
    logger.clear();
    if (program.validate) {
      if (!program.schema) {
        console.log('  ' + chalk.bgRed(' ERROR ') + ' ' + 'option `--schema <path>` missing');
        process.exit(1);
      }
      const result = validateTranslations({
        rootPath: path,
        schemaPath: program.schema,
        logger: logger,
        progress: progressBar()
      }).then((result) => {
        logger.flush();
        console.log('');
        console.log('  ' + chalk.green(successSymbol) + ' valid: ' + formatResult(result));
        process.exit(0);
      }).catch((err) => {
        logger.flush();
        console.log('');
        console.log('  ' + chalk.red(errorSymbol) + ' invalid: ' + formatResult(err.message));
        process.exit(1);
      });
    } else if (program.export) {
      const filter = program.filter || '\\.jsx?$';
      if (program.export && (pathLib.extname(program.export) && !pathLib.extname(program.export).match(filter))) {
        logger.error(program.export + ' does not match filter \'' + filter + '\'.');
        logger.flush();
        process.exit(1);
      }
      if (program.target && pathLib.extname(program.target) !== '.json') {
        logger.error(program.target + ' is not a json file.');
        logger.flush();
        process.exit(1);
      }
      exportTranslationKeys({
        rootPath: path,
        filePath: program.export,
        filter: program.filter,
        preprocessor: program.preprocessor,
        logger: (program.target)?logger:undefined,
        progress: (program.target)?progressBar():undefined
      }).then((result) => {
        logger.flush();
        if (program.target) {
            fs.writeFile(program.target, JSON.stringify(result, null, '\t'), 'utf-8', function (err) {
              if (err) {
                logger.error(err.message);
                logger.flush();
                process.exit(1);
                return;
              }
              console.log('  ' + chalk.green(successSymbol) + ' Exported translation keys to ' + program.target);
              process.exit(0);
            });
          } else {
            console.log(JSON.stringify(result, null, '\t'));
            process.exit(0);
          }
      }).catch((err) => {
        logger.error(err.message);
        logger.flush();
        process.exit(1);
      });
    } else {
      generateTranslationSchema({
        rootPath: path,
        filter: program.filter,
        preprocessor: program.preprocessor,
        logger: (program.schema)?logger:undefined,
        schemaPath: program.schema || './translation.schema.json',
        progress: (program.schema)?progressBar():undefined
      }).then((result) => {
        logger.flush();
        if (program.schema) {
            console.log('  ' + chalk.green(successSymbol) + ' Generated schema ' + program.schema);
            process.exit(0);
          } else {
            console.log(JSON.stringify(result, null, '\t'));
            process.exit(0);
          }
      }).catch((err) => {
        logger.error(err.message);
        logger.flush();
        process.exit(1);
      });
    }
  })
  .parse(process.argv);
