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
type Values<O extends object, Tuple extends (keyof O)[]> = {
  [Index in keyof Tuple]: O[Tuple[Index]];
} & { length: Tuple["length"] };

type PickByValue<OBJ_T, VALUE_T> = // From https://stackoverflow.com/a/55153000
  Pick<
    OBJ_T,
    { [K in keyof OBJ_T]: OBJ_T[K] extends VALUE_T ? K : never }[keyof OBJ_T]
  >;
type ObjectEntries<OBJ_T> = // From https://stackoverflow.com/a/60142095
  {
    [K in keyof OBJ_T]: [keyof PickByValue<OBJ_T, OBJ_T[K]>, OBJ_T[K]];
  }[keyof OBJ_T][];

export const ObjectTyped = {
  /**
  
     * Object.keys, but with nice typing (`Array<keyof T>`)
  
     */

  keys: Object.keys as <T extends object>(yourObject: T) => TupleUnion<keyof T>,

  /**
  
     * Object.values, but with nice typing (`Array<ValueOf<T>>`)
  
     * @deprecated - Built-in Object.values appears to have decent typing, and accounts for Arrays/ArrayLikes
  
     * (TS 4.4.2 - typing is: values<T>(yourObject: { [s: string]: T } | ArrayLike<T>): T[];)
  
     */

  values: Object.values as <U extends object>(
    yourObject: U
  ) => Values<U, TupleUnion<keyof U>>, // Using ValueOf here was giving weird hover annotation: ValueOf<{ ...the whole damn object... }> as opposed to ['key1', 'key2', etc]

  /**
  
     * Object.entries, but with nice typing
  
     */

  entries: Object.entries as <O extends object>(
    yourObject: O
  ) => ObjectEntries<O>,

  /**
  
     * Object.fromEntries, but with nice typing
  
     */

  fromEntries: Object.fromEntries as <K extends string, V>(
    yourObjectEntries: [K, V][]
  ) => Record<K, V>
};

// Built-ins documented here: https://www.typescriptlang.org/docs/handbook/utility-types.html

export type ValueOf<T> = T[keyof T];
