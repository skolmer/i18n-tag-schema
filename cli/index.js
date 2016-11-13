#!/usr/bin/env node
var program = require('commander');
var i18nTagSchemaModule = require('../dist/lib');
var generateTranslationSchema = i18nTagSchemaModule.generateTranslationSchema;
var validateTranslations = i18nTagSchemaModule.validateTranslations;
var exportTranslationKeys = i18nTagSchemaModule.exportTranslationKeys;
var chalk = require('chalk');
var pathLib = require('path');
var fs = require('fs');
var ProgressBar = require('progress');

var isSimpleWindowsTerm = process.platform === 'win32' && !/^xterm/i.test(process.env.TERM);
var errorSymbol = isSimpleWindowsTerm ? chalk.bold.red('×') : chalk.red('✖');
var successSymbol = isSimpleWindowsTerm ? chalk.bold.green('√') : chalk.green('✔');
var progressComplete = isSimpleWindowsTerm ? chalk.green('█') : chalk.green.inverse(' ');
var progressIncomplete = isSimpleWindowsTerm ? chalk.white('█') : chalk.white.inverse(' ');

var log = [];

var padString = function(str) { return ' ' + str.toUpperCase() + ' '; };
var errorFlag = function(str) { return chalk.inverse.bold.red(padString(str)); };
var warnFlag = function(str) { return chalk.inverse.bold.yellow(padString(str)); };
var infoFlag = function(str) { return chalk.inverse.bold.white(padString(str)); };
var successFlag = function(str) { return chalk.inverse.bold.green(padString(str)); };

var logger = {
  clear: function() { log = []; },
  info: function(message) {
    if(message.indexOf('i18n json schema has been generated;') > -1) {
      message = colorizeMessage(message);
    }
    return log.push(infoFlag('info') + ' ' + message);
  },
  warn: function(message) { return log.push(warnFlag('warn') + ' ' + message); },
  error: function(message) { return log.push(errorFlag('err!') + ' ' + message); },
  flush: function() {
    console.log(chalk.reset('\n'));
    for(var i = 0; i < log.length; i++) {
      console.log(log[i]);
    }
  }
}

function progressBar() {
  var progress;
  return function(current, total, name) {
    if(total > 50) {
      if(!progress) {
        console.log(' ');
        progress = new ProgressBar(chalk.reset(':bar  :current/:total  :etas  :name '), {
          total: total,
          complete: progressComplete,
          incomplete: progressIncomplete,
          width: 30
        });
      } else {
        progress.update(current / total, {
          name: name
        });
      }
    }
  }
}

function colorizeMessage(message) {
  message = message.replace(/(\d+)\s*%\s*translated/g, function(str, value) {
    var val = Number.parseInt(value);
    if (val < 50) {
      return errorFlag(str);
    } else if (val < 100) {
      return warnFlag(str);
    } else {
      return successFlag(str);
    }
  });
  message = message.replace(/(\d+)\s*keys/g, function(str) {
    return infoFlag(str);
  });
  message = message.replace(/(\d+)\s*added/g, function(str) {
    return successFlag(str);
  });
  message = message.replace(/(\d+)\s*removed/g, function(str) {
    return errorFlag(str);
  });
  message = message.replace(/(\d+)\s*missing/g, function(str, value) {
    var val = Number.parseInt(value);
    if (val === 0) {
      return successFlag(str);
    } else {
      return errorFlag(str);
    }
  });
  message = message.replace(/(\d+)\s*invalid/g, function(str) {
    return warnFlag(str);
  });
  return message;
}

function logValidationResult(message) {
  message = colorizeMessage(message);
  var messages = message.split('\n');
  messages.sort(function(a, b) {
    return (a.indexOf('missing') === -1) ? 0 : 1;
  });
  for(var i = 0; i < messages.length; i++) {
    console.log(' - ' + messages[i]);
  }
}

function getTabChar(number) {
  if(isNaN(number) || number < 0) return '\t';
  return new Array(Number.parseInt(number)+1).join(' ');
}

program
  .version('2.0.0')
  .usage('<path> [options]')
  .option('-p, --preprocessor <name>', 'the name of a preprocessor node module. for typescript use \'./preprocessors/typescript\'')
  .option('-s, --schema <path>', 'set path of the schema to create or validate against.\n                           If --schema is not set, JSON will be printed to the output.')
  .option('-f, --filter <regex>', 'a regular expression to filter source files. defaults to \\.jsx?$')
  .option('-v, --validate', 'use to validate translation file(s). path has to be a JSON file or directory.\n                           requires --schema <path>')
  .option('-e, --export <path>', 'export all translation keys FROM a JavaScript file or directory.')
  .option('-t, --target <path>', 'export all translation keys TO a JSON file. requires --export <path>.\n                           If --target is not set, JSON will be printed to the output.')
  .option('-i, --indention <number>', 'the number of spaces to be used instead of tabs. if not set, tabs will be used.')
  .action(function (path) {
    if (!path) {
      logger.error('missing `<path>` argument!');
      process.exit(1);
    }
    logger.clear();
    if (program.validate) {
      if (!program.schema) {
        logger.error('option `--schema <path>` missing!');
        process.exit(1);
      }
      validateTranslations({
        rootPath: path,
        schemaPath: program.schema,
        logger: logger,
        progress: progressBar()
      }).then(function(result) {
        logger.flush();
        console.log('');
        console.log(successFlag(successSymbol + ' valid') + '\n');
        logValidationResult(result);
        process.exit(0);
      }).catch(function(err) {
        logger.flush();
        console.log('');
        console.log(errorFlag(errorSymbol + ' invalid') + '\n');
        logValidationResult(err.message);
        process.exit(1);
      });
    } else if (program.export) {
      var filter = program.filter || '\\.jsx?$';
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
      }).then(function(result) {
        logger.flush();
        if (program.target) {
            fs.writeFile(program.target, JSON.stringify(result, null, getTabChar(program.indention)), 'utf-8', function (err) {
              if (err) {
                logger.error(err.message);
                logger.flush();
                process.exit(1);
                return;
              }
              console.log('');
              console.log(' ' + successSymbol + ' Exported translation keys to ' + program.target);
              process.exit(0);
            });
          } else {
            console.log(JSON.stringify(result, null, getTabChar(program.indention)));
            process.exit(0);
          }
      }).catch(function(err) {
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
        progress: (program.schema)?progressBar():undefined,
        indention: program.indention
      }).then(function(result) {
        logger.flush();
        if (program.schema) {
            console.log('');
            console.log(successFlag(successSymbol + ' generated schema') + ' ' + program.schema);
            process.exit(0);
          } else {
            console.log(JSON.stringify(result, null, getTabChar(program.indention)));
            process.exit(0);
          }
      }).catch(function(err) {
        logger.error(err.message);
        logger.flush();
        process.exit(1);
      });
    }
  })
  .parse(process.argv);
