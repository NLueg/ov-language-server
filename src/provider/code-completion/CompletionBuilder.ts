import {
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat
} from "vscode-languageserver";
import { AliasHelper } from "../../aliases/AliasHelper";
import { AliasKey } from "../../aliases/AliasKey";
import { Variable } from "../../data-model/syntax-tree/Variable";
import { OvServer } from "../../OvServer";
import { ISchemaProperty } from "../../rest-interface/schema/ISchemaProperty";
import { ISchemaType } from "../../rest-interface/schema/ISchemaType";
import { AsKeywordTransition } from "./states/AsKeywordTransition";
import { ConnectionTransition } from "./states/ConnectionTransition";
import { OperandTransition } from "./states/OperandTransition";
import { OperatorTransition } from "./states/OperatorTransition";
import { ThenKeywordTransition } from "./states/ThenKeywordTransition";
import { IStateTransition } from "./states/state-constructor/IStateTransition";
import { StateTransition } from "./states/StateTransition";
import { EmptyTransition } from "./states/EmptyTransition";

/**
 * This class is used for the building of the actual completion-items.
 * We use the generated transitions to do so.
 *
 * @export
 * @class CompletionBuilder
 */
export class CompletionBuilder {
  /**
   * Creates an default completionBuilder which only contains the global elements
   *
   * @static
   * @param {Variable[]} declarations variables of the current document
   * @param {OvServer} server server that has the aliasHelper and given schema as attributes
   * @returns
   * @memberof CompletionBuilder
   */
  public static default(
    declarations: Variable[],
    server: OvServer
  ): CompletionItem[] {
    return new CompletionBuilder(
      declarations,
      server.aliasHelper,
      server.schema
    )
      .addGlobals()
      .build();
  }

  private completionList: CompletionItem[];

  /**
   * Creates an instance of CompletionBuilder.
   *
   * @param {Variable[]} declarations variables of the current document
   * @param {AliasHelper} aliasHelper helper that contains a list of all available aliases
   * @param {ISchemaType} schema parsed schema
   * @param {string} [startingWord] word at the current position which is used for filtering
   * @memberof CompletionBuilder
   */
  constructor(
    private readonly declarations: Variable[],
    private readonly aliasHelper: AliasHelper,
    private readonly schema: ISchemaType,
    private readonly startingWord?: string
  ) {
    this.completionList = [];
  }

  /**
   * Adds all Keywords that should be globally available
   *
   * @returns {CompletionBuilder} builder-class
   * @memberof CompletionGenerator
   */
  public addGlobals(): CompletionBuilder {
    const transition: StateTransition = new EmptyTransition({});

    const ifWord = this.aliasHelper.getIfKeyword();
    const thenWord = this.aliasHelper.getThenKeyword();
    if (!!ifWord) {
      this.addKeyword(
        this.aliasHelper.getKeywordByAliasKey(AliasKey.IF),
        "a",
        transition
      );

      if (!!thenWord) {
        this.addSnippet(
          "Rule",
          ifWord + " $1 \n" + thenWord + " ${0:Error Message}",
          "b",
          transition
        );
      }
    }

    const asWord = this.aliasHelper.getAsKeyword();
    if (!!asWord) {
      this.addSnippet(
        "Variable",
        "$1 " + asWord + " ${2:variable}",
        "b",
        transition
      );
    }

    const constrainedWord: string[] = this.aliasHelper.getConstrainedKeywords();
    if (constrainedWord.length > 0) {
      this.addSnippet(
        "Constrained Rule",
        "$1 ${2:" + constrainedWord[0] + "} $0",
        "c",
        transition
      );
    }

    return this;
  }

  /**
   * Adds all operators which fit to the parameters of the transition
   *
   * @param {OperatorTransition} transition transition that contains necessary parameters
   * @returns {CompletionBuilder} builder-class
   * @memberof CompletionBuilder
   */
  public addFittingOperator(transition: OperatorTransition): CompletionBuilder {
    console.log(this.startingWord);
    for (const operator of this.aliasHelper.getOperators()) {
      if (
        transition.$dataType === operator[1][0] ||
        "Object" === operator[1][0]
      ) {
        this.addKeyword(
          operator[0],
          operator[1][1],
          transition,
          operator[1][0]
        );
      }
    }

    return this;
  }

  /**
   * Adds all operands which fit to the parameters of the transition
   *
   * @param {OperandTransition} transition transition that contains necessary parameters
   * @returns {CompletionBuilder} builder-class
   * @memberof CompletionBuilder
   */
  public addFittingIdentifier(
    transition: OperandTransition
  ): CompletionBuilder {
    this.declarations.forEach(variable => {
      if (transition.isValid(variable.$name, variable.$dataType)) {
        this.addVariable(variable.$name, variable.$dataType, "a", transition);
      }
    });

    this.schema.dataProperties.forEach(property => {
      if (transition.isValid(property.name, property.type)) {
        this.addVariable(property.name, property.type, "b", transition);
      }
    });

    const functions = this.aliasHelper.getFunctions();
    functions.forEach(func => {
      this.addFunction(func, "", "c", transition);
    });
    return this;
  }

  /**
   * Adds all logical operators which fit to the parameters of the transition
   *
   * @param {ConnectionTransition} transition transition that contains necessary parameters
   * @returns {CompletionBuilder} builder-class
   * @memberof CompletionBuilder
   */
  public addLogicalOperators(
    transition: ConnectionTransition
  ): CompletionBuilder {
    for (const logicalOperator of this.aliasHelper.getLogicalOperators()) {
      this.addKeyword(logicalOperator, "a", transition);
    }
    return this;
  }

  /**
   * Adds the then-keyword
   *
   * @param {ThenKeywordTransition} transition
   * @returns {CompletionBuilder} builder-class
   * @memberof CompletionBuilder
   */
  public addThenKeyword(transition: ThenKeywordTransition): CompletionBuilder {
    this.addKeyword(
      this.aliasHelper.getKeywordByAliasKey(AliasKey.THEN),
      "a",
      transition
    );
    return this;
  }

  /**
   * Adds the as-keyword
   *
   * @param {AsKeywordTransition} transition
   * @returns {CompletionBuilder} builder-class
   * @memberof CompletionBuilder
   */
  public addAsKeyword(transition: AsKeywordTransition): CompletionBuilder {
    const keyword = this.aliasHelper.getKeywordByAliasKey(AliasKey.AS);
    this.addSnippet(keyword, keyword + " ${1:variable}", "a", transition);
    return this;
  }

  /**
   * Generates completion for an complex-schema where the parents is the given name
   *
   * @param {string} parentName name of the given parent
   * @returns {CompletionBuilder} builder-class
   * @memberof CompletionBuilder
   */
  public addFittingChildren(parentName: string): CompletionBuilder {
    this.schema.complexData.forEach(property => {
      const manipulatedParent = parentName.endsWith(".")
        ? parentName.substring(0, parentName.length - 1)
        : parentName;
      if (property.parent === manipulatedParent) {
        const schemaProperty: ISchemaProperty[] = this.schema.dataProperties.filter(
          p => p.name === property.child
        );
        const dataType: string | null =
          schemaProperty.length > 0 ? schemaProperty[0].type : null;
        if (!!dataType) {
          var transition: StateTransition = new EmptyTransition({});
          this.addVariable(property.child, dataType, "a", transition);
        }
      }
    });
    return this;
  }

  /**
   * Generates completion for array items, where the given operandName should not be appended
   *
   * @param {string} operandName name of an operand that shouldn't appear
   * @returns {CompletionBuilder} builder-class
   * @memberof CompletionBuilder
   */
  public addOperandsWithTypeOfGivenOperand(
    operandName: string
  ): CompletionBuilder {
    const variables: Variable | undefined = this.declarations.find(
      declaration => declaration.$name === operandName
    );
    if (!!variables) {
      var constructor: IStateTransition = {
        prependingText: " "
      };
      return this.addFittingIdentifier(
        new OperandTransition(variables.$dataType, [operandName], constructor)
      );
    }

    const schema: ISchemaProperty | undefined = this.schema.dataProperties.find(
      property => property.name === operandName
    );
    if (!!schema) {
      var constructor: IStateTransition = {
        prependingText: " "
      };
      return this.addFittingIdentifier(
        new OperandTransition(schema.type, [operandName], constructor)
      );
    }

    return this;
  }

  /**
   * Last method of the build which returns all generated items
   *
   * @returns {CompletionItem[]} returns all generated completion-items
   * @memberof CompletionBuilder
   */
  public build(): CompletionItem[] {
    return this.completionList;
  }

  /**
   * Method for adding a variable
   *
   * @private
   * @param {(string | null)} label label that will be shown as a title
   * @param {string} dataType datatype as a documentation-text
   * @param {string} sortText text which decide in which order the items appear
   * @param {string} prependedText text which will be added before the label in case the item gets selected
   * @returns {CompletionBuilder}
   * @memberof CompletionBuilder
   */
  private addVariable(
    label: string | null,
    dataType: string,
    sortText: string,
    baseTransition: StateTransition
  ): CompletionBuilder {
    if (!label) {
      return this;
    }

    const completionItem = this.createCompletionItemWithTextInsertion(
      label,
      label,
      sortText,
      baseTransition
    );
    completionItem.kind = CompletionItemKind.Variable;
    completionItem.detail = dataType;
    this.completionList.push(completionItem);
    return this;
  }

  /**
   * Method for adding a function
   *
   * @private
   * @param {(string | null)} label label that will be shown as a title
   * @param {string} dataType datatype as a documentation-text
   * @param {string} sortText text which decide in which order the items appear
   * @param {string} prependedText text which will be added before the label in case the item gets selected
   * @returns {CompletionBuilder}
   * @memberof CompletionBuilder
   */
  private addFunction(
    label: string | null,
    dataType: string,
    sortText: string,
    baseTransition: StateTransition
  ): CompletionBuilder {
    if (!label) {
      return this;
    }

    const completionItem = this.createCompletionItemWithTextInsertion(
      label,
      label,
      sortText,
      baseTransition
    );
    completionItem.kind = CompletionItemKind.Function;
    completionItem.detail = dataType;
    this.completionList.push(completionItem);
    return this;
  }

  /**
   * Method for adding a keyword
   *
   * @private
   * @param {(string | null)} label label that will be shown as a title
   * @param {string} sortText text which decide in which order the items appear
   * @param {string} prependedText text which will be added before the label in case the item gets selected
   * @param {string} [documentation] extra documentation text
   * @returns {CompletionBuilder}
   * @memberof CompletionBuilder
   */
  private addKeyword(
    label: string | null,
    sortText: string,
    baseTransition: StateTransition,
    documentation?: string
  ): CompletionBuilder {
    if (!label) {
      return this;
    }

    const completionItem = this.createCompletionItemWithTextInsertion(
      label,
      label,
      sortText,
      baseTransition
    );
    completionItem.kind = CompletionItemKind.Keyword;
    completionItem.preselect = true;

    if (!!documentation) {
      completionItem.detail = documentation;
    }

    this.completionList.push(completionItem);
    return this;
  }

  /**
   * Method for adding a snipped
   *
   * @private
   * @param {(string | null)} label label that will be shown as a title
   * @param {string} text text that will be insered in case the item gets selected
   * @param {string} sortText text which decide in which order the items appear
   * @param {string} prependedText text which will be added before the label in case the item gets selected
   * @returns {CompletionBuilder}
   * @memberof CompletionBuilder
   */
  private addSnippet(
    label: string | null,
    text: string,
    sortText: string,
    baseTransition: StateTransition
  ): CompletionBuilder {
    if (!label) {
      return this;
    }

    const completionItem = this.createCompletionItemWithTextInsertion(
      label,
      text,
      sortText,
      baseTransition
    );
    completionItem.kind = CompletionItemKind.Snippet;
    completionItem.insertTextFormat = InsertTextFormat.Snippet;
    completionItem.sortText = sortText;
    this.completionList.push(completionItem);

    return this;
  }

  /**
   * Creates a CompletionItem, that holds the information for code-completion
   * with a different label and text to insert
   *
   * @static
   * @param {string} label label to show in the suggestion-list
   * @param {string} text text to insert, when suggestion gets picked
   * @param {string} sortText text, that is used for special sorting of items
   * @param {string} prependedText text that gets inserted after the completionItem
   * @returns {CompletionItem} created CompletionItem
   * @memberof CompletionItemHelper
   */
  private createCompletionItemWithTextInsertion(
    label: string,
    text: string,
    sortText: string,
    baseTransition: StateTransition
  ): CompletionItem {
    const item = CompletionItem.create(label);
    item.sortText = sortText;
    item.filterText = baseTransition.$filterStartText + label;
    item.insertText = baseTransition.$prependingText + text;

    if (!!baseTransition.$range) {
      item.textEdit = {
        range: baseTransition.$range.asRange(),
        newText: label
      };
    }

    return item;
  }
}
