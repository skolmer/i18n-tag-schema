import path from 'path'
import { exportTranslationKeys } from '../lib'
import silentLogger from './data/silentLogger'

global.console = silentLogger

describe('exportTranslationKeys', () => {
  it('should fail if rootPath param is missing', async () => {
    silentLogger.clear()
    const filePath = './data/grouped.js'
    try {
      await exportTranslationKeys({
        filePath,
        logger: silentLogger
      })
    } catch(err) {
      expect(err.message).toEqual('rootPath is not defined.')
      expect(silentLogger.get('error')).toContain('rootPath is not defined.')
    }
  })

  it('should export all templates from a directory', async () => {
    const rootPath = path.resolve(__dirname, './data')
    const templates = await exportTranslationKeys({
      rootPath,
      logger: { toConsole: true }
    })
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
          'Hallo!',
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
  })

  it('should report export progress', async () => {
    const rootPath = path.resolve(__dirname, './data')
    let last = -1
    await exportTranslationKeys({
      rootPath,
      logger: { toConsole: true },
      progress: (current, total, name) => {
        expect(name).toBeDefined()
        expect(current > last || current === total).toBeTruthy()
        last = current
        expect(total).toEqual(5)
      }
    })
  })

  it('should export grouped templates as array', async () => {
    const rootPath = path.resolve(__dirname, './data')
    const filePath = path.resolve(__dirname, './data/grouped.js')
    const templates = await exportTranslationKeys({
      rootPath,
      filePath,
      logger: { toConsole: true }
    })
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
  })

  it('should export multiline templates as array', async () => {
    const rootPath = path.resolve(__dirname, './data')
    const filePath = path.resolve(__dirname, './data/multiline.js')
    const templates = await exportTranslationKeys({
      rootPath,
      filePath
    })
    expect(templates).toEqual([
      '\n        <user name="${0}">${1}</user>\n    ',
      '\n    <users>\n    ${0}\n    </users>\n',
      {
        'group': 'custom inline group',
        'items': ['Hallo!', 'Hello!']
      }
    ])
  })

  it('should fail if file does not exist', async () => {
    const rootPath = path.resolve(__dirname, './data')
    const filePath = path.resolve(__dirname, './data/unknown.js')
    try {
      await exportTranslationKeys({
        rootPath,
        filePath
      })
    } catch(err) {
      expect(err.message).toEqual(`ENOENT: no such file or directory, lstat '${filePath}'`)
    }
  })

  it('should support typescript', async () => {
    const rootPath = path.resolve(__dirname, './data')
    const filePath = path.resolve(__dirname, './data/typescript.ts')
    const templates = await exportTranslationKeys({
      rootPath,
      filePath,
      filter: /\.tsx?$/,
      preprocessor: './preprocessors/typescript',
      logger: { toConsole: true }
    })
    expect(templates).toEqual(['Process exiting with code \'${0}\'.'])
  })

})