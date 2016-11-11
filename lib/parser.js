import { traverseAst } from './traversal'
import * as babylon from 'babylon'
// eslint-disable-next-line import/namespace
import * as ts from 'typescript'

const babylonConfig = {
  sourceType: 'module',
  plugins: [
    'jsx',
    'asyncFunctions',
    'flow',
    'classConstructorCall',
    'doExpressions',
    'trailingFunctionCommas',
    'objectRestSpread',
    'decorators',
    'classProperties',
    'exportExtensions',
    'exponentiationOperator',
    'asyncGenerators',
    'functionBind',
    'functionSent'
  ]
}

export const parseFile = (contents, templatePatterns, typescript = false) => {
  if(typescript) {
    contents = ts.transpileModule(contents, { compilerOptions: { target: ts.ScriptTarget.Latest  } }).outputText
  }

  const templateRegEx = /i18n(?:\(.*?\))?\s*`[^`]*`/g
  const matches = templateRegEx.exec(contents)
  const templates = []
  if (matches && matches.length) {
    const ev = (source) => {
      const ast = babylon.parse(source, babylonConfig)
      traverseAst(ast, source, templates, templatePatterns)
    }
    ev(contents)
  }
  return { templates, templatePatterns }
}