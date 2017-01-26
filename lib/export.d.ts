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

type TemplateGroup = {
    /*
     * Translation group
    */
    group: string,
    /*
     * Translation keys
    */
    items: Array<string>
};

type ReadOptions = {
    /**
     * The root directory of your source files.
     */
    rootPath: string ,
    /**
     * The full path of a source file.
     */
    filePath: string,
    /**
     * The content of the source file as string.
     */
    content: string,
    /**
     * The current list of templates to merge into.
     */
    templates?: Array<string | {}>,
    /**
     * The current map of template patterns to merge into.
     */
    templatePatterns?: {
      [template : string]: string
    },
    /**
     * A custom logger.
     */
    logger?: Logger,
    /**
     * A custom preprocessor like `./preprocessors/typescript`.
     */
    preprocessor?: string | ((code: string) => string),
    /**
     * A custom babylon configuration.
     */
    babylonConfig?: {}
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
    preprocessor?: string | ((code: string) => string),
    /**
     * A custom postprocessor like `./postprocessors/po`.
     */
    postprocessor?: string | ((templates: Array<string | TemplateGroup>) => string),
    /**
     * A custom babylon configuration.
     */
    babylonConfig?: {}
};

type TranslationKeyExport = {
  /**
   * A list of translation keys and groups
   */
  templates: Array<string | TemplateGroup>,
  /**
   * The translation patterns for validation purpose.
   */
  templatePatterns: {
    [template : string]: string
  }
};

/**
 * Generates an array of all i18n tagged template literals in your ES2015 source code.
 *
 * @param options The read options.
 */
export function readTemplatesFromFileContent(options: ReadOptions) : TranslationKeyExport

/**
 * Generates an array of all i18n tagged template literals in a file.
 *
 * @param options The export options.
 */
export function exportTranslationKeysFromFiles(options: ExportOptions) : Promise<TranslationKeyExport>