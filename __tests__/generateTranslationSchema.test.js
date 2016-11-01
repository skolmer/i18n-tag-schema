import path from 'path'
import fs from 'fs'
import { generateTranslationSchema } from '../lib'

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
        generateTranslationSchema({
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
        generateTranslationSchema({
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
})