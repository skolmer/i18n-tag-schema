import { traverseAst } from './traversal'
import { processObject } from './utils'
import * as babylon from 'babylon'

const defaultBabylonConfig = {
  sourceType: 'module',
  plugins: [
    '*'
  ]
}

export const parseFile = (contents, templatePatterns, preprocessor, babylonConfig) => {
  contents = processObject(contents, preprocessor)
  const templateRegEx = /i18n(?:\(.*?\))?\s*`[^`]*`/g
  const matches = templateRegEx.exec(contents)
  const templates = []
  if (matches && matches.length) {
    const ev = (source) => {
      const ast = babylon.parse(source, babylonConfig || defaultBabylonConfig)
      traverseAst(ast, source, templates, templatePatterns)
    }
    ev(contents)
  }
  return { templates, templatePatterns }
}