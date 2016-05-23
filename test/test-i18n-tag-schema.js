import path from 'path';
import fs from 'fs';
import assert from 'assert';
import i18nTagSchema from '../dist/lib';

describe('i18n-tag-schema', () => {
    it(`should match json string`, (done) => {
        const actual = {
            "type": "object",
            "properties": {
                "Hello ${0}, you have ${1} in your bank account.": {
                    "type": "string"
                }
            },
            "additionalProperties": false
        }
        const filter = '\\.jsx?'
        const srcPath = path.resolve(__dirname, './samples')
        i18nTagSchema(srcPath, filter, null, (log) => {
            assert.equal(JSON.stringify(actual), JSON.stringify(log));
            done();
        })
    })

    it(`should match json file`, (done) => {
        const actual = {
            "type": "object",
            "properties": {
                "Hello ${0}, you have ${1} in your bank account.": {
                    "type": "string"
                }
            },
            "additionalProperties": false
        }
        const filter = '\\.jsx?'
        const srcPath = path.resolve(__dirname, './samples')
        const schema = path.resolve(__dirname, './samples/schema.json')
        i18nTagSchema(srcPath, filter, schema, () => {
            let prevJson = fs.readFileSync(schema, 'utf-8')
            assert.equal(JSON.stringify(actual), JSON.stringify(JSON.parse(prevJson)));
            done();
        })
    })
})

