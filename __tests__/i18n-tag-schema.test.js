import path from 'path'
import fs from 'fs'
import i18nTagSchema, { exportTranslationKeys, validateSchema } from '../lib'

const expected = {
    'type': 'object',
    'properties': {
        '$schema': {
            'type': 'string'
        },
        '\n        <user name="${0}">${1}</user>\n    ': {
            'type': 'string',
            'minLength': 1,
            'pattern': '(?=.*?\\$\\{0\\})(?=.*?\\$\\{1\\})'
        },
        '\n    <users>\n    ${0}\n    </users>\n': {
            'type': 'string',
            'minLength': 1,
            'pattern': '(?=.*?\\$\\{0\\})'
        },
        'custom group': {
            'type': 'object',
            'properties': {
                'Hello ${0}, you have ${1} in your bank account.': {
                    'type': 'string',
                    'minLength': 1,
                    'pattern': '(?=.*?\\$\\{0\\})(?=.*?\\$\\{1\\})'
                }
            },
            'required': [
                'Hello ${0}, you have ${1} in your bank account.'
            ]
        },
        'custom group 2': {
            'type': 'object',
            'properties': {
                'Hello ${0}, you have ${1} in your bank account.': {
                    'type': 'string',
                    'minLength': 1,
                    'pattern': '(?=.*?\\$\\{0\\})(?=.*?\\$\\{1\\})'
                }
            },
            'required': [
                'Hello ${0}, you have ${1} in your bank account.'
            ]
        },
        'custom inline group': {
            'type': 'object',
            'properties': {
                'Hello!': {
                    'type': 'string',
                    'minLength': 1
                },
                'Welcome!': {
                    'type': 'string',
                    'minLength': 1
                }
            },
            'required': [
                'Hello!',
                'Welcome!'
            ]
        },
        'grouped.js': {
            'type': 'object',
            'properties': {
                'Hello ${0}, you have ${1} in your bank account.': {
                    'type': 'string',
                    'minLength': 1,
                    'pattern': '(?=.*?\\$\\{0\\})(?=.*?\\$\\{1\\})'
                }
            },
            'required': [
                'Hello ${0}, you have ${1} in your bank account.'
            ]
        }
    },
    'required': [
        '\n        <user name="${0}">${1}</user>\n    ',
        '\n    <users>\n    ${0}\n    </users>\n',
        'custom group',
        'custom group 2',
        'custom inline group',
        'grouped.js'
    ],
    'additionalProperties': false
}

describe('i18n-tag-schema', () => {
    it('should match json string', (done) => {
        const filter = '\\.jsx?$'
        const srcPath = path.resolve(__dirname, './samples')
        i18nTagSchema(srcPath, filter, null, (message, type) => {
            switch (type) {
                case 'success':
                    expect(JSON.stringify(JSON.parse(message))).toEqual(JSON.stringify(expected))
                    done()
                    break
            }
        })
    })

    it('should match json file', (done) => {
        const filter = '\\.jsx?$'
        const srcPath = path.resolve(__dirname, './samples')
        const schema = path.resolve(__dirname, './samples/schema.json')
        i18nTagSchema(srcPath, filter, schema, (message, type) => {
            const prevJson = fs.readFileSync(schema, 'utf-8')
            switch (type) {
                case 'success':
                    expect(JSON.stringify(JSON.parse(prevJson))).toEqual(JSON.stringify(expected))
                    done()
                    break
            }
        })
    })

    it('should export templates as array', (done) => {
        const srcPath = path.resolve(__dirname, './samples')
        const filePath = path.resolve(__dirname, './samples/grouped.js')
        const filePath2 = path.resolve(__dirname, './samples/multiline.js')
        exportTranslationKeys(srcPath, filePath, undefined,
            (templates) => {
                expect(JSON.stringify(JSON.parse(templates))).toEqual(JSON.stringify(
                    [
                        '\n        <user name="${0}">${1}</user>\n    ',
                        '\n    <users>\n    ${0}\n    </users>\n',
                        {
                            'group': 'custom group',
                            'items': [
                                'Hello ${0}, you have ${1} in your bank account.'
                            ]
                        },
                        {
                            'group': 'custom group 2',
                            'items': [
                                'Hello ${0}, you have ${1} in your bank account.'
                            ]
                        },
                        {
                            'group': 'custom inline group',
                            'items': [
                                'Hello!',
                                'Welcome!'
                            ]
                        },
                        {
                            'group': 'grouped.js',
                            'items': [
                                'Hello ${0}, you have ${1} in your bank account.'
                            ]
                        }
                    ]
                ))
                exportTranslationKeys(srcPath, filePath2, undefined,
                    (templates) => {
                        expect(JSON.stringify(JSON.parse(templates))).toEqual(JSON.stringify(
                            [
                                '\n        <user name="${0}">${1}</user>\n    ',
                                '\n    <users>\n    ${0}\n    </users>\n',
                                {
                                    'group': 'custom inline group',
                                    'items': ['Hello!']
                                }
                            ]
                        ))
                        done()
                    }
                )
            }
        )
    })

    it('should validate translations', (done) => {
        const schemaPath = path.resolve(__dirname, './samples/schema.json')
        const translationPath = path.resolve(__dirname, './samples/translation.json')
        validateSchema(translationPath, schemaPath, (message, type) => {
            if (type === 'success' || type === 'error') {
                expect(message).toEqual('translation.json has 2 missing translations; 71% translated.')
                done()
            }
        })
    })
})

