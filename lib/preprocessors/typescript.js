export default (contents) => {
  const ts = require('typescript')
  if(!ts) throw new Error('cannot find typescript compiler. check if \'typescript\' node module is installed.')
  const processed = ts.transpileModule(contents, { compilerOptions: { target: ts.ScriptTarget.Latest, jsx: 'preserve' } })
  if(processed && processed.outputText) {
    return processed.outputText
  }
  return ''
}