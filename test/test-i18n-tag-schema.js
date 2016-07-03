
import path from 'path'
import fs from 'fs'
import assert from 'assert'
import i18nTagSchema from '../lib'

const expected = {
    'definitions': {
        'translations': {
            'type': 'object',
            'properties': {
                '$schema': {
                    'type': 'string'
                },
                '\n        <user name="${0}">${1}</user>\n    ': {
                    'type': 'string'
                },
                '\n    <users>\n    ${0}\n    </users>\n': {
                    'type': 'string'
                },
                'custom group': {
                    'type': 'object',
                    'properties': {
                        'Hello ${0}, you have ${1} in your bank account.': {
                            'type': 'string'
                        }
                    }
                },
                'custom group 2': {
                    'type': 'object',
                    'properties': {
                        'Hello ${0}, you have ${1} in your bank account.': {
                            'type': 'string'
                        }
                    }
                },
                'custom inline group': {
                    'type': 'object',
                    'properties': {
                        'Hello!': {
                            'type': 'string'
                        },
                        'Welcome!': {
                            'type': 'string'
                        }
                    }
                }
            },
            'additionalProperties': false
        },
        'group': {
            'type': 'object',
            'properties': {
                '$schema': {
                    'type': 'string'
                }
            },
            'patternProperties': {
                '^([^/]+(/|\\.jsx?))+$': {
                    '$ref': '#/definitions/translations'
                }
            },
            'additionalProperties': false
        }
    },
    'type': 'object',
    'oneOf': [
        { '$ref': '#/definitions/translations' },
        { '$ref': '#/definitions/group' }
    ]
}

const expectedGrouped = {
    'type': 'object',
    'properties': {
        '$schema': {
            'type': 'string'
        },
        'custom group': {
            'type': 'object',
            'properties': {
                'Hello ${0}, you have ${1} in your bank account.': {
                    'type': 'string'
                }
            }
        },
        'custom group 2': {
            'type': 'object',
            'properties': {
                'Hello ${0}, you have ${1} in your bank account.': {
                    'type': 'string'
                }
            }
        },
        'custom inline group': {
            'type': 'object',
            'properties': {
                'Hello!': {
                    'type': 'string'
                },
                'Welcome!': {
                    'type': 'string'
                }
            }
        },
        'multiline.js': {
            'type': 'object',
            'properties': {
                '\n        <user name="${0}">${1}</user>\n    ': {
                    'type': 'string'
                },
                '\n    <users>\n    ${0}\n    </users>\n': {
                    'type': 'string'
                }
            }
        }
    },
    'additionalProperties': false
}

describe('i18n-tag-schema', () => {
    it('should match json string', (done) => {
        const filter = '\\.jsx?'
        const srcPath = path.resolve(__dirname, './samples')
        i18nTagSchema(srcPath, filter, null, false, (message, type) => {

            switch (type) {
                case 'success':
                    assert.equal(JSON.stringify(JSON.parse(message)), JSON.stringify(expected))
                    done()
                    break
                case 'error':
                case 'info':
                    console.info(`    ${message}`)
                    break
            }
        })
    })

    it('should match json file', (done) => {
        const filter = '\\.jsx?'
        const srcPath = path.resolve(__dirname, './samples')
        const schema = path.resolve(__dirname, './samples/schema.json')
        i18nTagSchema(srcPath, filter, schema, false, (message, type) => {
            const prevJson = fs.readFileSync(schema, 'utf-8')
            switch (type) {
                case 'success':
                    assert.equal(JSON.stringify(JSON.parse(prevJson)), JSON.stringify(expected))
                    done()
                    break
                case 'error':
                case 'info':
                    console.info(`    ${message}`)
                    break
            }
        })
    })

    it('should support file grouping', (done) => {
        const filter = '\\.jsx?'
        const srcPath = path.resolve(__dirname, './samples')
        i18nTagSchema(srcPath, filter, null, true, (message, type) => {

            switch (type) {
                case 'success':
                    assert.equal(JSON.stringify(JSON.parse(message)), JSON.stringify(expectedGrouped))
                    done()
                    break
                case 'error':
                case 'info':
                    console.info(`    ${message}`)
                    break
            }
        })
    })
})

