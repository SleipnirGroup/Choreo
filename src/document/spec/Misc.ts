export const SAVE_FILE_VERSION = "v2025.0.0";
/**
 * An expression is a tuple of a string and a number.
 *
 * The string is a mathematical expression that can be evaluated to a number.
 * The number is the value of the expression.
 */
export type Expr = [string, number];

/**
 * A union type of an expression or a number.
 */
export type ExprOrNumber = Expr | number;
