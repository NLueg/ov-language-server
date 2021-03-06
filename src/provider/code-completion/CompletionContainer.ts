import { CompletionBuilder } from "./CompletionBuilder";
import { AsKeywordTransition } from "./states/AsKeywordTransition";
import { ConnectionTransition } from "./states/ConnectionTransition";
import { EmptyTransition } from "./states/EmptyTransition";
import { OperandTransition } from "./states/OperandTransition";
import { OperatorTransition } from "./states/OperatorTransition";
import { StateTransition } from "./states/StateTransition";
import { ThenKeywordTransition } from "./states/ThenKeywordTransition";
import { IStateTransition } from "./states/state-constructor/IStateTransition";

/**
 * This class is used for saving the valid transitions of the current state
 *
 * @export
 * @class CompletionContainer
 */
export class CompletionContainer {
  public get $transitions(): StateTransition[] {
    return this.transitions;
  }

  /**
   * Returns an empty instance of the completionContainer
   *
   * @static
   * @returns {CompletionContainer} this
   * @memberof CompletionContainer
   */
  public static init(): CompletionContainer {
    return new CompletionContainer();
  }
  private transitions: StateTransition[];

  /**
   * Creates an instance of CompletionContainer.
   * @memberof CompletionContainer
   */
  constructor() {
    this.transitions = [];
  }

  /**
   * Determines if transitions are already set
   *
   * @returns {boolean} true, if we have no transitions
   * @memberof CompletionContainer
   */
  public isEmpty(): boolean {
    return this.$transitions.length === 0;
  }

  public addTransition(transition: StateTransition): CompletionContainer {
    this.transitions.push(transition);
    return this;
  }

  /**
   * Adds an connectionTransition to the transitions
   *
   * @returns {CompletionContainer} this
   * @memberof CompletionContainer
   */
  public connectionTransition(): CompletionContainer {
    this.transitions.push(new ConnectionTransition());
    return this;
  }

  /**
   * Adds an thenKeywordTransition to the transitions
   *
   * @returns {CompletionContainer} this
   * @memberof CompletionContainer
   */
  public thenKeywordTransition(): CompletionContainer {
    this.transitions.push(new ThenKeywordTransition());
    return this;
  }

  /**
   * Adds an asKeywordTransition to the transitions
   *
   * @returns {CompletionContainer} this
   * @memberof CompletionContainer
   */
  public asKeywordTransition(): CompletionContainer {
    this.transitions.push(new AsKeywordTransition());
    return this;
  }

  /**
   * Adds an operatorTransition with the given datatype to the transitions
   *
   * @param {string} dataType datatype that the operator should have
   * @param {IStateTransition} [constructor] interface that contains some extra attributes
   * @returns {CompletionContainer} this
   * @memberof CompletionContainer
   */
  public operatorTransition(
    dataType: string,
    constructor?: IStateTransition
  ): CompletionContainer {
    this.transitions.push(new OperatorTransition(dataType, constructor));
    return this;
  }

  /**
   * Adds an operandTransition with the given datatype, namefilter and prependingText.
   * If nothing is given, all operands will be shown in the completion
   *
   * @param {string} [dataType] datatype of the operand
   * @param {string} [nameFilter] name of items that shouldn't show up
   * @param {IStateTransition} [constructor] interface that contains some extra attributes
   * @returns {CompletionContainer}
   * @memberof CompletionContainer
   */
  public operandTransition(
    dataType?: string,
    nameFilter?: string,
    constructor?: IStateTransition
  ): CompletionContainer {
    this.transitions.push(
      new OperandTransition(
        dataType,
        !!nameFilter ? [nameFilter] : [],
        constructor
      )
    );
    return this;
  }

  /**
   * Adds an emptyTransition to the transitions
   *
   * @returns {CompletionContainer} this
   * @memberof CompletionContainer
   */
  public emptyTransition(): CompletionContainer {
    this.transitions.push(new EmptyTransition());
    return this;
  }

  /**
   * Adds a name-filter to all operand-transitions
   *
   * @param {string} name name of an operand that shouldn't appear
   * @memberof CompletionContainer
   */
  public addNameFilterToAllOperands(name: string) {
    this.transitions.forEach(transition => {
      if (transition instanceof OperandTransition) {
        transition.addNameFilter(name);
      }
    });
  }

  /**
   * Fills the given completionBuilder with all transitions
   *
   * @param {CompletionBuilder} generator generator that should be manipulated
   * @returns {CompletionBuilder} manipulated generator
   * @memberof CompletionContainer
   */
  public getCompletions(generator: CompletionBuilder): CompletionBuilder {
    this.transitions.forEach(transition =>
      transition.addCompletionItems(generator)
    );
    return generator;
  }
}
