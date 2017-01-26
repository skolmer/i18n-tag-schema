export default (keys) => {
  if(keys.length) {
    return keys.map((key) => {
      if(typeof key === 'object') {
        return key.items.map((item) => `msgctxt ${JSON.stringify(key.group)}\nmsgid ${JSON.stringify(item)}\nmsgstr ""\n`).join('\n')
      } else {
        return `msgid ${JSON.stringify(key)}\nmsgstr ""\n`
      }
    }).join('\n')
  }
  return ''
}