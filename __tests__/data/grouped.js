import i18nc, { i18nGroup as e } from 'es2015-i18n-tag'

@e('custom group')
export class Test {
    log() {
        console.log(this.i18n`Hello ${name}, you have ${amount}:c in your bank account.`)
        console.log(i18nc('custom inline group') `Hello!`)
        console.log(this.i18n('custom inline group') `Welcome!`)

console.log(i18nc`
    <users>
    ${hello.map((item) => i18nc`
        <user name="${item.name}">${item.percentage}:p</user>
    `).join('')}
    </users>
`)

    }
}


class TestX {
    log() {
        console.log(this.i18n`Hello ${name}, you have ${amount}:c in your bank account.`)
        console.log(i18nc('custom inline group') `Hello!`)
        console.log(this.i18n('custom inline group') `Welcome!`)
        console.log(i18nc(__translationGroup) `Hello!`)
    }
}
export default e('custom group 2')(TestX)

@e(__translationGroup)
export class TestY {
    log() {
        console.log(this.i18n`Hello ${name}, you have ${amount}:c in your bank account.`)
        console.log(i18nc('custom inline group') `Hello!`)
        console.log(this.i18n('custom inline group') `Welcome!`)
    }
}