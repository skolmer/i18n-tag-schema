import path from 'path'
import { validateTranslations } from '../lib'

describe('validateTranslations', () => {
    it('should validate translations', (done) => {
        const schemaPath = path.resolve(__dirname, './samples/schema.json')
        const translationPath = path.resolve(__dirname, './samples/translation.json')
        validateTranslations({
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