import path from 'path'
import { validateTranslations } from '../lib'
import silentLogger from './data/silentLogger'

global.console = silentLogger

describe('validateTranslations', () => {
  it('should fail if rootPath param is missing', async () => {
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    try {
      await validateTranslations({
        schemaPath,
        logger: { toConsole: true }
      })
    } catch(err) {
      expect(err.message).toEqual('rootPath is not defined.')
    }
  })

  it('should fail if schemaPath param is missing', async () => {
    const rootPath = path.resolve(__dirname, './data')
    try {
      await validateTranslations({
        rootPath,
        logger: { toConsole: true },
      })
    } catch(err) {
      expect(err.message).toEqual('schemaPath is not defined.')
    }
  })

  it('should fail if rootPath is invalid', async () => {
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    try {
      await validateTranslations({
        rootPath: 'unknown',
        schemaPath,
        logger: { toConsole: true },
      })
    } catch(err) {
      expect(err.message).toContain('ENOENT: no such file or directory')
    }
  })

  it('should report validation progress', async () => {
    let last = 0
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    const rootPath = path.resolve(__dirname, './data')
    try {
      await validateTranslations({
        rootPath,
        schemaPath,
        logger: { toConsole: true },
        progress: (current, total, name) => {
          expect(name).toBeDefined()
          expect(current).toBeGreaterThan(last)
          last = current
          expect(total).toEqual(2)
        }
      })
    } catch(err) {
      // ignore validation error
    }
  })

  it('should validate translations', async () => {
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    const rootPath = path.resolve(__dirname, './data')
    try {
      await validateTranslations({
        rootPath,
        schemaPath,
        logger: { toConsole: true }
      })
    } catch(err) {
      expect(err.message).toContain('translation.json has 4 missing translations and 1 invalid key; 56% translated.')
      expect(err.message).toContain('translation.valid.json is valid and 100% translated!')
    }
  })

  it('should validate single translation file', async () => {
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    const translationPath = path.resolve(__dirname, './data/translation.json')
    try {
      await validateTranslations({
        rootPath: translationPath,
        schemaPath,
        logger: { toConsole: true }
      })
    } catch(err) {
      expect(err.message).toEqual('translation.json has 4 missing translations and 1 invalid key; 56% translated.')
    }
  })

  it('should successfully validate single translation file', async () => {
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    const translationPath = path.resolve(__dirname, './data/translation.valid.json')
    const result = await validateTranslations({
      rootPath: translationPath,
      schemaPath,
      logger: { toConsole: true }
    })
    expect(result).toEqual('translation.valid.json is valid and 100% translated!')
  })

  it('should warn but not fail if translation parameters are missing', async () => {
    silentLogger.clear()
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    const translationPath = path.resolve(__dirname, './data/translations')
    const result = await validateTranslations({
      rootPath: translationPath,
      schemaPath,
      logger: silentLogger
    })
    expect(result).toContain('translation.valid.json is valid and 100% translated!')
    expect(result).toContain('translation.valid.1.json has 0 missing translations; 100% translated.')
    expect(silentLogger.get('warn')).toContain('translation.valid.1.json translation of [\'custom group 2\'][\'Hello ${0}, you have ${1} in your bank account.\'] does not include all parameters')
  })
})