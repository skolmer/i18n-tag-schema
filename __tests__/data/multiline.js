import i18n, { i18nGroup } from 'es2015-i18n-tag'

console.log(i18n`
    <users>
    ${hello.map((item) => i18n`
        <user name="${item.name}">${item.percentage}:p</user>
    `).join('')}
    </users>
`)

console.log(i18n('custom inline group') `Hello!`)
console.log(i18n('custom inline group') `Hallo!`)