import * as path from 'path'

export default (contents, filePath) => {
  const ts = require('typescript')
  if(!ts) throw new Error('cannot find typescript compiler. check if \'typescript\' node module is installed.')
  const processed = ts.transpileModule(contents, {
    compilerOptions: {
      target: ts.ScriptTarget.Latest,
      jsx: path.extname(filePath) !== '.ts' ? ts.JsxEmit.Preserve : ts.JsxEmit.None
    }
  })
  if(processed && processed.outputText) {
    return processed.outputText
  }
  return ''
}