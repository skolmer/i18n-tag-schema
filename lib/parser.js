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
  if(!contents) return { templates: [], templatePatterns }
  contents = processObject(contents, preprocessor)
  const templates = []
  const ev = (source) => {
    const ast = babylon.parse(source, babylonConfig || defaultBabylonConfig)
    traverseAst(ast, source, templates, templatePatterns)
  }
  ev(contents)
  return { templates, templatePatterns }
}