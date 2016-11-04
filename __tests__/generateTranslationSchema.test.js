import path from 'path'
import fs from 'fs'
import { generateTranslationSchema } from '../lib'
import silentLogger from './data/silentLogger'

global.console = silentLogger

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

  it('should fail if srcPath param is missing', (done) => {
    silentLogger.clear()
    generateTranslationSchema({
      logger: silentLogger,
      callback: (status, result) => {
        expect(status).toEqual(1)
        expect(result).toEqual('srcPath is not defined.')
        expect(silentLogger.get('error')).toContain('srcPath is not defined.')
        done()
      }
    })
  })

  it('should fail if srcPath is invalid', (done) => {
    generateTranslationSchema({
      logger: { toConsole: true },
      srcPath: 'unknown',
      callback: (status, result) => {
        expect(status).toEqual(1)
        expect(result).toContain('ENOENT: no such file or directory')
        done()
      }
    })
  })

  it('should report schema progress', (done) => {
    let last = 0
    const filter = '\\.jsx?$'
    const srcPath = path.resolve(__dirname, './data')
    generateTranslationSchema({
      srcPath,
      filter,
      logger: { toConsole: true },
      progress: (current, total, name) => {
        expect(name).toBeDefined()
        expect(current).toBeGreaterThan(last)
        last = current
        expect(total).toEqual(4)
        if(current === 4) done()
      }
    })
  })

  it('should match json string', (done) => {
    const filter = '\\.jsx?$'
    const srcPath = path.resolve(__dirname, './data')
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
    const srcPath = path.resolve(__dirname, './data')
    const schemaPath = path.resolve(__dirname, './data/schema.json')
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

  it('should create schema if not exists', (done) => {
    const filter = '\\.jsx?$'
    const srcPath = path.resolve(__dirname, './data')
    const schemaPath = path.resolve(__dirname, './data/schematest.json')
    generateTranslationSchema({
      srcPath,
      schemaPath,
      filter,
      logger: { toConsole: true },
      callback: (status) => {
        expect(status).toEqual(0)
        const json = fs.readFileSync(schemaPath, 'utf-8')
        expect(JSON.parse(json)).toEqual(expected)
        fs.unlinkSync(schemaPath)
        done()
      }
    })
  })

  it('should generate empty schema', (done) => {
    const filter = 'empty\\.jsx?$'
    const srcPath = path.resolve(__dirname, './data')
    generateTranslationSchema({
      srcPath,
      filter,
      logger: { toConsole: true },
      callback: (status, result) => {
        expect(status).toEqual(0)
        expect(result).toEqual({})
        done()
      }
    })
  })

  it('should generate empty schema file', (done) => {
    const filter = 'empty\\.jsx?$'
    const srcPath = path.resolve(__dirname, './data')
    const schemaPath = path.resolve(__dirname, './data/schematest.json')
    generateTranslationSchema({
      srcPath,
      schemaPath,
      filter,
      logger: { toConsole: true },
      callback: (status) => {
        expect(status).toEqual(0)
        const json = fs.readFileSync(schemaPath, 'utf-8')
        expect(JSON.parse(json)).toEqual({})
        fs.unlinkSync(schemaPath)
        done()
      }
    })
  })
})