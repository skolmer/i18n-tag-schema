import path from 'path'
import { exportTranslationKeys } from '../lib'

describe('exportTranslationKeys', () => {
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
})