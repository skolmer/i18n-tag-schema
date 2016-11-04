import path from 'path'
import { validateTranslations } from '../lib'
import silentLogger from './data/silentLogger'

global.console = silentLogger

describe('validateTranslations', () => {
  it('should fail if rootPath param is missing', (done) => {
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    validateTranslations({
      schemaPath,
      logger: { toConsole: true },
      callback: (status, result) => {
        expect(status).toEqual(1)
        expect(result).toEqual('rootPath is not defined.')
        done()
      }
    })
  })

  it('should fail if schemaPath param is missing', (done) => {
    const rootPath = path.resolve(__dirname, './data')
    validateTranslations({
      rootPath,
      logger: { toConsole: true },
      callback: (status, result) => {
        expect(status).toEqual(1)
        expect(result).toEqual('schemaPath is not defined.')
        done()
      }
    })
  })

  it('should fail if rootPath is invalid', (done) => {
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    validateTranslations({
      rootPath: 'unknown',
      schemaPath,
      logger: { toConsole: true },
      callback: (status, result) => {
        expect(status).toEqual(1)
        expect(result).toContain('ENOENT: no such file or directory')
        done()
      }
    })
  })

  it('should validate translations', (done) => {
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    const rootPath = path.resolve(__dirname, './data')
    validateTranslations({
      rootPath,
      schemaPath,
      logger: { toConsole: true },
      callback: (status, result) => {
        expect(status).toEqual(1)
        expect(result).toContain('translation.json has 3 missing translations and 1 invalid key; 63% translated.')
        expect(result).toContain('translation.valid.json is valid and 100% translated!')
        done()
      }
    })
  })

  it('should validate single translation file', (done) => {
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    const translationPath = path.resolve(__dirname, './data/translation.json')
    validateTranslations({
      rootPath: translationPath,
      schemaPath,
      logger: { toConsole: true },
      callback: (status, result) => {
        expect(status).toEqual(1)
        expect(result).toEqual('translation.json has 3 missing translations and 1 invalid key; 63% translated.')
        done()
      }
    })
  })

  it('should successfully validate single translation file', (done) => {
    const schemaPath = path.resolve(__dirname, './data/schema.json')
    const translationPath = path.resolve(__dirname, './data/translation.valid.json')
    validateTranslations({
      rootPath: translationPath,
      schemaPath,
      logger: { toConsole: true },
      callback: (status, result) => {
        expect(status).toEqual(0)
        expect(result).toEqual('translation.valid.json is valid and 100% translated!')
        done()
      }
    })
  })
})