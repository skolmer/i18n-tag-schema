import { traverseAst } from './traversal'
import * as babylon from 'babylon'

const templatePatterns = {}

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

export const parseFile = (contents) => {  
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