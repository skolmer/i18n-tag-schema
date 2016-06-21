@i18nGroup(__translationGroup)
export default class Test {
    log() {
        console.log(this.i18n`Hello ${name}, you have ${amount}:c in your bank account.`)
        console.log(i18n('test') `Hello!`)
        console.log(this.i18n('test') `Welcome!`)
    }    
}