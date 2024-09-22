/**
 * https://github.com/devinrhode2/ObjectTyped
 *
 * Nicely typed aliases for some `Object` Methods

 * - PSA: Don't mutate `yourObject`s

 * - Numerical keys are BAD, resolve that issue upstream

 * - Discussion: https://stackoverflow.com/a/65117465/565877

 */
export type TupleUnion<
  U extends string | number | symbol,
  R extends any[] = []
> = {
  [S in U]: Exclude<U, S> extends never
    ? [S, ...R]
    : TupleUnion<Exclude<U, S>, [S, ...R]>;
}[U];

export const ObjectTyped = {
  /**

     * Object.keys, but with nice typing (`Array<keyof T>`)

     */

  keys: Object.keys as <T extends object>(yourObject: T) => TupleUnion<keyof T>
};

// Built-ins documented here: https://www.typescriptlang.org/docs/handbook/utility-types.html

export type ValueOf<T> = T[keyof T];
