
import path from 'path';
import fs from 'fs';
import assert from 'assert';
import i18nTagSchema from '../lib';

 const expected = {
    "type": "object",
    "properties": {
        "Hello ${0}, you have ${1} in your bank account.": {
            "type": "string"
        },
        "\r\n        <user name=\"${0}\">${1}</user>\r\n    ": {
            "type": "string"
        },
        "\r\n    <users>\r\n    ${0}\r\n    </users>\r\n": {
            "type": "string"
        }
    },
    "additionalProperties": false
}

describe('i18n-tag-schema', () => {
    it(`should match json string`, (done) => {
        const filter = '\\.jsx?'
        const srcPath = path.resolve(__dirname, './samples')
        i18nTagSchema(srcPath, filter, null, (log) => {
            assert.equal(JSON.stringify(log), JSON.stringify(expected));
            done();
        })
    })

    it(`should match json file`, (done) => {
        const filter = '\\.jsx?'
        const srcPath = path.resolve(__dirname, './samples')
        const schema = path.resolve(__dirname, './samples/schema.json')
        i18nTagSchema(srcPath, filter, schema, () => {
            let prevJson = fs.readFileSync(schema, 'utf-8')
            assert.equal(JSON.stringify(JSON.parse(prevJson)), JSON.stringify(expected));
            done();
        })
    })
})

