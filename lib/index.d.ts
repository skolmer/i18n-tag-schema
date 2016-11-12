// index.d.ts

type Logger = {
    /*
      A custom info logging function.
    */
    info?: (message : string) => void,
    /*
      A trace info logging function.
    */
    trace?: (message : string) => void,
    /*
      A warn info logging function.
    */
    warn?: (message : string) => void,
    /*
      A error info logging function.
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
 * If no target schema is provided the json will be returned via callback output param.
 *
 * @param options The schema options.
 */
export function generateTranslationSchema(options: SchemaOptions) : Promise<{}>

/**
 * Generates an array of all i18n tagged template literals in a file.
 * The array will be returned as json via callback output param.
 *
 * @param options The translation options.
 */
export function exportTranslationKeys(options: ExportOptions) : Promise<{}>

/**
 * Validates a translation file or folder and calculates translation coverage
 *
 * @param options The validation options.
 */
export function validateSchema(options: ValidateOptions) : Promise<string>