
const name = 'Steffen'
const amount = 1250.33
const x = 'test'
i18n.translate(x /* "test ${0}" */, name)

i18n.translate('Hello ${0}, you have ${1} in your bank account.', name, { value: amount, formatter: 'c'})

i18n.translate('Total: ${0}', { value: amount, formatter: 'd', format: 2})

i18n(__translationGroup, 'my-lib').translate('Welcome') // Select translation from module group e.g. "components/App.js"
i18n('components/Clock.js', 'my-lib').translate('Time') // Select translation from a custom group
i18n(__translationGroup, 'my-lib').translate(x /* ["myvar1", "myvar2 ${0} ${1}"] */)

class Clock {
  tick() {
      return this.i18n.translate('Time: ${0}', { value: new Date(), formatter: 't', format: 'T' })
  }
}
export default i18nGroup(__translationGroup, 'my-lib')(Clock)

@i18nGroup(null, 'my-lib')
class Test {
  tick() {
      return this.i18n.translate('Total: ${0}', { value: 45.9956, formatter: 'n', format: '2' })
  }
}
export { Test }