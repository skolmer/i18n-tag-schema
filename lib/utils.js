const pushIfNotExist = (array, item) => {
  if (array.indexOf(item) === -1) {
    array.push(item)
  }
}

const getOrCreateGroup = (templates, group) => {
  return templates.find((item) => item.group === group) ||
    templates[templates.push({
      group,
      items: []
    }) - 1]
}

export const getTabChar = (spaces) => {
  if(isNaN(spaces) || spaces < 0) return '\t'
  return ' '.repeat(spaces)
}

export const sortTemplates = (array) => {
  array.forEach((item) => {
    if(item.items) item.items.sort()
  })
  return array.sort(function (a, b) {
    const x = a.group || a, y = b.group || b
    return ((x < y) ? -1 : ((x > y) ? 1 : 0))
  })
}

export const mergeTemplates = (templates, newTemplates, fileGroup) => {
  const mergedTemplates = [...templates]
  newTemplates.forEach((t) => {
    if (t.group) {
      const grp = getOrCreateGroup(mergedTemplates, (t.group === '__translationGroup') ? fileGroup : t.group)
      pushIfNotExist(grp.items, t.value)
    } else {
      pushIfNotExist(mergedTemplates, t)
    }
  })
  return mergedTemplates
}