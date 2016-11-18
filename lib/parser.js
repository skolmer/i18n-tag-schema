import { traverseAst } from './traversal'
import * as babylon from 'babylon'

const defaultBabylonConfig = {
  sourceType: 'module',
  plugins: [
    '*'
  ]
}

export const parseFile = (contents, templatePatterns, preprocessor, babylonConfig) => {
  if(preprocessor) {
    let preproc = require(preprocessor)
    if(typeof preproc !== 'function' && preproc.default) preproc = preproc.default
    if(!preproc || typeof preproc !== 'function') throw new Error(`cannot find preprocessor. check if node module '${preprocessor}' is installed.`)
    contents = preproc(contents)
  }

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