import { AliasHelper } from "src/aliases/AliasHelper";
import { IComplexData } from "src/rest-interface/schema/IComplexData";
import { String } from "typescript-string-operations";
import { AliasKey } from "../../aliases/AliasKey";
import { StringHelper } from "../../helper/StringHelper";
import { TreeTraversal } from "../../helper/TreeTraversal";
import { OvServer } from "../../OvServer";
import { GeneralApiResponse } from "../../rest-interface/response/GeneralApiResponse";
import { ISchemaProperty } from "../../rest-interface/schema/ISchemaProperty";
import { OperationSyntaxStructure } from "./OperatorSyntaxStructure";

export class TextMateParameter {
    private _keywords: string[];
    private _identifier: string[];
    private _complexSchemaProperties: IComplexData[];
    private _staticStrings: string[];
    private _thenKeyword: string | null;
    private _commentKeyword: string | null;
    private _operations: OperationSyntaxStructure[];

    private aliasHelper: AliasHelper;

    constructor(private readonly apiResponse: GeneralApiResponse, server: OvServer) {
        this.aliasHelper = server.aliasHelper;

        this._staticStrings = !apiResponse.staticStrings ? [] : apiResponse.staticStrings;
        this._identifier = this.getIdentifier(server.schema.dataProperties);
        this._complexSchemaProperties = server.schema.complexData;
        this._keywords = server.aliasHelper.getGenericKeywords();

        var traversal = new TreeTraversal();
        var tmpOperations = traversal.getOperations(apiResponse.mainAstNode.getScopes());
        this._operations = tmpOperations.map(o => new OperationSyntaxStructure(o));

        this._thenKeyword = server.aliasHelper.getKeywordByAliasKey(AliasKey.THEN);
        this._commentKeyword = server.aliasHelper.getKeywordByAliasKey(AliasKey.COMMENT);
    }

    public get keywords(): string[] {
        return this._keywords;
    }
    public get identifier(): string[] {
        return this._identifier;
    }
    public get complexSchemaProperties(): IComplexData[] {
        return this._complexSchemaProperties;
    }
    public get staticStrings(): string[] {
        return this._staticStrings;
    }
    public get thenKeyword(): string | null {
        return this._thenKeyword;
    }
    public get commentKeyword(): string | null {
        return this._commentKeyword;
    }
    public get operations(): OperationSyntaxStructure[] {
        return this._operations;
    }

    /**
     * Generates a list of all identifiers which includes the schema and variableNames
     *
     * @private
     * @param {GeneralApiResponse} apiResponse response, that holds the variableNames
     * @param {JSON} schema schema that contains the identifiers
     * @returns {string[]} list of all identifiers
     * @memberof OvSyntaxNotifier
     */
    private getIdentifier(schema: Array<ISchemaProperty>): string[] {
        var identifier: string[] = [];

        if (!!this.apiResponse.variableNames)
            identifier = identifier.concat(this.apiResponse.variableNames.filter(n => !String.IsNullOrWhiteSpace(n)));

        if (!!schema && schema.length > 0)
            identifier = identifier.concat(schema.map(property => property.name));

        return identifier;
    }

    /**
     *
     *
     * @returns {(string | null)}
     * @memberof TextMateParameter
     */
    public getOperationRegExp(): string | null {
        var stringList: string[] = [];

        for (const operation of this.operations) {
            var tmpString = operation.getRegExpAsString();
            if (!tmpString) continue;

            stringList.push(tmpString);
        }
        if (stringList.length == 0) return null;
        return StringHelper.getOredRegEx(stringList);
    }


    /**
     *
     *
     * @returns {(string | null)}
     * @memberof TextMateParameter
     */
    public getComplexSchemaRegExp(): string | null {
        if (!this.complexSchemaProperties) return null;

        var parents = this.complexSchemaProperties.map(p => p.parent);
        var childs = this.complexSchemaProperties.map(p => p.child);
        if (parents.length == 0 || childs.length == 0) return null;

        var parentKeywordString = StringHelper.getOredRegExForWords(parents);
        var ofKeywordString = "(?i)\\s*(" + StringHelper.getOredRegExForWords(this.aliasHelper.getOfKeywords()) + ")\\s*";
        var childKeywordString = StringHelper.getOredRegExForWords(childs);

        return StringHelper.getComplexRegExWithOutherBounds(childKeywordString, ofKeywordString, parentKeywordString);
    }
}