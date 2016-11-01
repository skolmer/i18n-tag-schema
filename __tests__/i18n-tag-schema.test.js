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
                },
                'Hello!': {
                    'type': 'string',
                    'minLength': 1
                }
            },
            'required': [                
                'Hello ${0}, you have ${1} in your bank account.',
                'Hello!'
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
        i18nTagSchema({
          srcPath, 
          filter, 
          logger: { toConsole: true },
          callback: (status, result) => {
              expect(status).toEqual(0)
              expect(result).toEqual(expected)
              done()
          }
        })
    })

    it('should match json file', (done) => {
        const filter = '\\.jsx?$'
        const srcPath = path.resolve(__dirname, './samples')
        const schemaPath = path.resolve(__dirname, './samples/schema.json')
        i18nTagSchema({
          srcPath, 
          schemaPath,
          filter, 
          logger: { toConsole: true },
          callback: (status) => {
              expect(status).toEqual(0)
              const json = fs.readFileSync(schemaPath, 'utf-8')
              expect(JSON.parse(json)).toEqual(expected)
              done()
          }
        })
    })

    it('should export templates as array', (done) => {
        const rootPath = path.resolve(__dirname, './samples')
        const filePath = path.resolve(__dirname, './samples/grouped.js')
        const filePath2 = path.resolve(__dirname, './samples/multiline.js')
        exportTranslationKeys({
          rootPath, 
          filePath, 
          logger: { toConsole: true },
          callback: (status, templates) => {
                expect(status).toEqual(0)
                expect(templates).toEqual([
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
                            'Hello ${0}, you have ${1} in your bank account.',
                            'Hello!'
                        ]
                    }
                ])
                exportTranslationKeys({
                  rootPath, 
                  filePath: filePath2,
                  callback: (status, templates) => {
                        expect(status).toEqual(0)
                        expect(templates).toEqual([
                            '\n        <user name="${0}">${1}</user>\n    ',
                            '\n    <users>\n    ${0}\n    </users>\n',
                            {
                                'group': 'custom inline group',
                                'items': ['Hello!']
                            }
                        ])
                        done()
                    }
                })
            }
        })
    })

    it('should validate translations', (done) => {
        const schemaPath = path.resolve(__dirname, './samples/schema.json')
        const translationPath = path.resolve(__dirname, './samples/translation.json')
        validateSchema({
          rootPath: translationPath, 
          schemaPath, 
          logger: { toConsole: true },
          callback: (status, result) => {
            expect(status).toEqual(1)
            expect(result).toEqual('translation.json has 3 missing translations; 63% translated.')
            done()
          }
        })
    })
})

