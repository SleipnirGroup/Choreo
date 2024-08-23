/**
 * https://github.com/devinrhode2/ObjectTyped
 * 
 * Nicely typed aliases for some `Object` Methods

 * - PSA: Don't mutate `yourObject`s

 * - Numerical keys are BAD, resolve that issue upstream

 * - Discussion: https://stackoverflow.com/a/65117465/565877

 */

export const ObjectTyped = {
  /**
  
     * Object.keys, but with nice typing (`Array<keyof T>`)
  
     */

  keys: Object.keys as <T extends {}>(yourObject: T) => Array<keyof T>,

  /**
  
     * Object.values, but with nice typing (`Array<ValueOf<T>>`)
  
     * @deprecated - Built-in Object.values appears to have decent typing, and accounts for Arrays/ArrayLikes
  
     * (TS 4.4.2 - typing is: values<T>(yourObject: { [s: string]: T } | ArrayLike<T>): T[];)
  
     */

  values: Object.values as <U extends {}>(yourObject: U) => Array<U[keyof U]>, // Using ValueOf here was giving weird hover annotation: ValueOf<{ ...the whole damn object... }> as opposed to ['key1', 'key2', etc]

  /**
  
     * Object.entries, but with nice typing
  
     */

  entries: Object.entries as <O extends {}>(
    yourObject: O
  ) => Array<[keyof O, O[keyof O]]>,

  /**
  
     * Object.fromEntries, but with nice typing
  
     */

  fromEntries: Object.fromEntries as <K extends string, V>(
    yourObjectEntries: [K, V][]
  ) => Record<K, V>
};

// Built-ins documented here: https://www.typescriptlang.org/docs/handbook/utility-types.html

export type ValueOf<T> = T[keyof T];
