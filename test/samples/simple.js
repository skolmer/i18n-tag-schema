console.log(i18n`Hello ${ name }, you have ${ amount }:c in your bank account.`)

console.log(i18n`
    <users>
    ${hello.map((item) => i18n`
        <user name="${item.name}">${item.percentage}:p</user>
    `).join('')}
    </users>
`)