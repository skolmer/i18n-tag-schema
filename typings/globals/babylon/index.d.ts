// Generated by typings
// Source: https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/0754cc639a1354a5f52df45c1fd1b0293b90224d/babylon/babylon.d.ts
declare module "babylon" {
    import * as t from 'babel-types';
    type Node = t.Node;

    export function parse(code: string, opts?: BabylonOptions): Node;

    export interface BabylonOptions {
        /**
         * By default, import and export declarations can only appear at a program's top level.
         * Setting this option to true allows them anywhere where a statement is allowed.
         */
        allowImportExportEverywhere?: boolean;

        /**
         * By default, a return statement at the top level raises an error. Set this to true to accept such code.
         */
        allowReturnOutsideFunction?: boolean;

        allowSuperOutsideMethod?: boolean;

        /**
         * Indicate the mode the code should be parsed in. Can be either "script" or "module".
         */
        sourceType?: 'script' | 'module';

        /**
         * Correlate output AST nodes with their source filename. Useful when
         * generating code and source maps from the ASTs of multiple input files.
         */
        sourceFilename?: string;

        /**
         * Array containing the plugins that you want to enable.
         */
        plugins?: PluginName[];
    }

    export type PluginName = 'jsx' | 'flow' | 'asyncFunctions' | 'classConstructorCall' | 'doExpressions'
        | 'trailingFunctionCommas' | 'objectRestSpread' | 'decorators' | 'classProperties' | 'exportExtensions'
        | 'exponentiationOperator' | 'asyncGenerators' | 'functionBind' | 'functionSent';
}