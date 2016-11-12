// index.d.ts

type Logger = {
    /*
      A custom info logging function.
    */
    info?: (message : string) => void,
    /*
      A custom trace logging function.
    */
    trace?: (message : string) => void,
    /*
      A custom warn logging function.
    */
    warn?: (message : string) => void,
    /*
      A custom error logging function.
    */
    error?: (message : string) => void,
    /*
      Log to default console.
    */
    toConsole?: boolean
};

type ExportOptions = {
    /**
     * The root directory of your source files.
     */
    rootPath: string ,
    /**
     * The full path of a source file.
     */
    filePath?: string,
    /**
     * A regex to filter source files by name or extension. Defaults to `\.jsx?$`.
     */
    filter?: string,
    /**
     * A custom logger.
     */
    logger?: Logger,
    /**
     * A progress callback.
     */
    progress?: (current: number, total: number, name: string) => void,
    /**
     * A custom preprocessor like `./preprocessors/typescript`.
     */
    preprocessor?: string,
    /**
     * A custom babylon configuration.
     */
    babylonConfig?: {}
};

type SchemaOptions = {
    /**
     * The root directory of your source files.
     */
    rootPath: string ,
    /**
     * The target path of the JSON schema.
     */
    schemaPath?: string,
    /**
     * A regex to filter source files by name or extension. Defaults to `\.jsx?$`.
     */
    filter?: string,
    /**
     * A custom logger.
     */
    logger?: Logger,
    /**
     * A progress callback.
     */
    progress?: (current: number, total: number, name: string) => void,
    /**
     * A custom preprocessor like `./preprocessors/typescript`.
     */
    preprocessor?: string,
    /**
     * A custom babylon configuration.
     */
    babylonConfig?: {}
};

type ValidateOptions = {
    /**
     * The root directory of your source files.
     */
    rootPath: string ,
    /**
     * The target path of the JSON schema.
     */
    schemaPath?: string,
    /**
     * A regex to filter source files by name or extension. Defaults to `\.jsx?$`.
     */
    logger?: Logger,
    /**
     * A progress callback.
     */
    progress?: (current: number, total: number, name: string) => void
};

/**
 * Generates a JSON schema based on i18n tagged template literals.
 *
 * @param options The schema options.
 */
export function generateTranslationSchema(options: SchemaOptions) : Promise<{}>

/**
 * Generates an array of all i18n tagged template literals in a file.
 *
 * @param options The export options.
 */
export function exportTranslationKeys(options: ExportOptions) : Promise<Array<{} | string>>

/**
 * Validates a translation file or folder and calculates translation coverage
 *
 * @param options The validation options.
 */
export function validateTranslations(options: ValidateOptions) : Promise<string>