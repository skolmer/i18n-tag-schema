import path from 'path'
import { validateTranslations } from '../lib'

describe('validateTranslations', () => {
  it('should fail if rootPath param is missing', (done) => {
    const schemaPath = path.resolve(__dirname, './samples/schema.json')
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
    const rootPath = path.resolve(__dirname, './samples')
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

  it('should validate translations', (done) => {
    const schemaPath = path.resolve(__dirname, './samples/schema.json')
    const rootPath = path.resolve(__dirname, './samples')
    validateTranslations({
      rootPath,
      schemaPath,
      logger: { toConsole: true },
      callback: (status, result) => {
        expect(status).toEqual(1)
        expect(result).toEqual('translation.json has 3 missing translations and 1 invalid key; 63% translated.')
        done()
      }
    })
  })

  it('should validate single translation file', (done) => {
    const schemaPath = path.resolve(__dirname, './samples/schema.json')
    const translationPath = path.resolve(__dirname, './samples/translation.json')
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
})