import path from 'path'
import fs from 'fs'
import { generateTranslationSchema } from '../lib'
import silentLogger from './data/silentLogger2'

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
    '${0} ${1}': {
      'type': 'string',
      'minLength': 1,
      'pattern': '(?=.*?\\$\\{0\\})(?=.*?\\$\\{1\\})'
    },
    'custom group': {
      'type': 'object',
      'properties': {
        'Hello ${0}, Hello ${1}.': {
          'minLength': 1,
          'pattern': '(?=.*?\\$\\{0\\})(?=.*?\\$\\{1\\})',
          'type': 'string'
        },
        'Hello ${0}, you have ${1} in your bank account.': {
          'type': 'string',
          'minLength': 1,
          'pattern': '(?=.*?\\$\\{0\\})(?=.*?\\$\\{1\\})'
        }
      },
      'required': [
        'Hello ${0}, Hello ${1}.',
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
        'Hallo!': {
          'type': 'string',
          'minLength': 1
        },
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
        'Hallo!',
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
    '${0} ${1}',
    'custom group',
    'custom group 2',
    'custom inline group',
    'grouped.js'
  ],
  'additionalProperties': false
}

describe('i18n-tag-schema', () => {

  it('should fail if rootPath param is missing', async () => {
    silentLogger.clear()
    try {
      await generateTranslationSchema({
        logger: silentLogger
      })
    } catch(err) {
      expect(err.message).toEqual('rootPath is not defined.')
      expect(silentLogger.get('error')).toContain('rootPath is not defined.')
    }
  })

  it('should fail if rootPath is invalid', async () => {
    try {
      await generateTranslationSchema({
        logger: { toConsole: true },
        rootPath: 'unknown'
      })
    } catch(err) {
      expect(err.message).toContain('ENOENT: no such file or directory')
    }
  })

  it('should report schema progress', async () => {
    let last = -1
    const filter = '\\.jsx?$'
    const rootPath = path.resolve(__dirname, './data')
    await generateTranslationSchema({
      rootPath,
      filter,
      logger: { toConsole: true },
      progress: (current, total, name) => {
        expect(name).toBeDefined()
        expect(current > last || current === total).toBeTruthy()
        last = current
        expect(total).toEqual(7)
      }
    })
  })

  it('should match json string', async () => {
    const filter = '\\.jsx?$'
    const rootPath = path.resolve(__dirname, './data')
    const result = await generateTranslationSchema({
      rootPath,
      filter,
      logger: { toConsole: true }
    })
    expect(result).toEqual(expected)
  })

  it('should match json file', async () => {
    const filter = '\\.jsx?$'
    const rootPath = path.resolve(__dirname, './data')
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    await generateTranslationSchema({
      rootPath,
      schemaPath,
      filter,
      logger: { toConsole: true }
    })
    const json = fs.readFileSync(schemaPath, 'utf-8')
    expect(JSON.parse(json)).toEqual(expected)
  })

  it('should create schema if not exists', async () => {
    const filter = '\\.jsx?$'
    const rootPath = path.resolve(__dirname, './data')
    const schemaPath = path.resolve(__dirname, './data/schematest.json')
    await generateTranslationSchema({
      rootPath,
      schemaPath,
      filter,
      logger: { toConsole: true }
    })
    const json = fs.readFileSync(schemaPath, 'utf-8')
    expect(JSON.parse(json)).toEqual(expected)
  })

  it('should generate empty schema', async () => {
    const filter = 'empty\\.jsx?$'
    const rootPath = path.resolve(__dirname, './data')
    const result = await generateTranslationSchema({
      rootPath,
      filter,
      logger: { toConsole: true }
    })
    expect(result).toEqual({})
  })

  it('should generate empty schema file', async () => {
    const filter = 'empty\\.jsx?$'
    const rootPath = path.resolve(__dirname, './data')
    const schemaPath = path.resolve(__dirname, './data/schematest.json')
    await generateTranslationSchema({
      rootPath,
      schemaPath,
      filter,
      logger: { toConsole: true }
    })
    const json = fs.readFileSync(schemaPath, 'utf-8')
    expect(JSON.parse(json)).toEqual({})
    fs.unlinkSync(schemaPath)
  })

  it('should have tabs as default indention', async () => {
    const filter = '\\.jsx?$'
    const rootPath = path.resolve(__dirname, './data')
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    await generateTranslationSchema({
      rootPath,
      schemaPath,
      filter,
      logger: { toConsole: true }
    })
    const json = fs.readFileSync(schemaPath, 'utf-8')
    expect(json).toContain('\n\t"type": "object"')
  })

  it('should allow 2 spaces as tabs', async () => {
    const filter = '\\.jsx?$'
    const rootPath = path.resolve(__dirname, './data')
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    await generateTranslationSchema({
      rootPath,
      schemaPath,
      filter,
      logger: { toConsole: true },
      indention: 2
    })
    const json = fs.readFileSync(schemaPath, 'utf-8')
    expect(json).toContain('\n  "type": "object"')
  })

  it('should allow 4 spaces as tabs', async () => {
    const filter = '\\.jsx?$'
    const rootPath = path.resolve(__dirname, './data')
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    await generateTranslationSchema({
      rootPath,
      schemaPath,
      filter,
      logger: { toConsole: true },
      indention: 4
    })
    const json = fs.readFileSync(schemaPath, 'utf-8')
    expect(json).toContain('\n    "type": "object"')
  })
})