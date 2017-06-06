import i18n, { i18nGroup } from 'es2015-i18n-tag'

console.log(i18n`
    <users>
    ${hello.map((item) => i18n`
        <user name="${item.name}">${item.percentage}:p</user>
    `).join('')}
    </users>
`)

const format = (val, item) => i18n`${val / 100}:n(0) ${(item.currency || '').toUpperCase()}`

console.log(i18n('custom inline group') `Hello!`)
console.log(i18n('custom inline group') `Hallo!`)