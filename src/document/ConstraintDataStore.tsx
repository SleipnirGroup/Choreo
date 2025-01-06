import {
  IModelType,
  ISimpleType,
  IType,
  Instance,
  ModelPropertiesDeclarationToProperties,
  types
} from "mobx-state-tree";
import { Expr, isExpr } from "./2025/DocumentTypes";
import {
  ConstraintData,
  ConstraintDefinition,
  ConstraintKey,
  ConstraintPropertyDefinition,
  ConstraintPropertyType,
  DataMap,
  PropertyDefinitionList,
  consts
} from "./ConstraintDefinitions";
import {
  ExpressionStore,
  IExpressionStore,
  IVariables
} from "./ExpressionStore";

type lookup<T extends ConstraintPropertyType> = T extends Expr
  ? typeof ExpressionStore
  : T extends boolean
    ? boolean
    : never;

type Props<K extends ConstraintKey, D extends ConstraintData = DataMap[K]> = {
  // @ts-expect-error lookup type is fragile
  [propkey in keyof D["props"]]: lookup<D["props"][propkey]>;
} & {
  type: ISimpleType<D["type"]>;
  def: IType<
    ConstraintDefinition<K> | null | undefined,
    ConstraintDefinition<K>,
    ConstraintDefinition<K>
  >;
};
type DataStoreProps<K extends ConstraintKey> =
  ModelPropertiesDeclarationToProperties<Props<K>>;

export type ConstraintSetters<
  K extends ConstraintKey,
  D extends ConstraintData = DataMap[K]
> = {
  [setterkey in keyof D["props"] as `set${Capitalize<string & setterkey>}`]: (
    arg: D["props"][setterkey]
  ) => void;
};
export type ConstraintDataStore<
  K extends ConstraintKey,
  D extends ConstraintData = DataMap[K]
> = IModelType<
  DataStoreProps<K>,
  ConstraintSetters<K> & {
    serialize: D;
    deserialize: (ser: D) => void;
    deserPartial: (ser: Partial<D["props"]>) => void;
  }
>;

export type IConstraintDataStore<K extends ConstraintKey> = Instance<
  ConstraintDataStore<K>
>;

function createDataStore<
  K extends ConstraintKey,
  D extends ConstraintData = DataMap[K]
>(def: ConstraintDefinition<K>): ConstraintDataStore<K> {
  // The object mapping the properties to ExpressionStore or to default primitives
  const props: Partial<Props<K>> = {};
  // The object of setters for primitives
  type Setter<U> = U extends any ? (self: any) => (arg: U) => void : never;
  type PropertySetter = Setter<ConstraintPropertyType>;
  const setters: { [key: string]: PropertySetter } = {};
  // The function to serialize into a data object
  let serialize: (self: any) => Partial<D["props"]> = (_self) => ({});
  let deserialize: (self: any, data: D["props"]) => void = (_self, _data) => {};
  let deserPartial: (self: any, data: Partial<D["props"]>) => void = (
    self,
    data
  ) => {};
  // Iterate through each property. based on the type of its default value, add the correct infrastructure
  Object.keys(def.properties).forEach((k) => {
    const key = k as keyof D["props"] & string;
    const defau = def.properties[key].defaultVal;
    const settername = "set" + key[0].toUpperCase() + key.slice(1);
    const oldSerialize = serialize;
    const oldDeserialize = deserialize;
    const oldDeserPartial = deserPartial;
    if (isExpr(defau)) {
      //@ts-expect-error not assignable
      props[key] = ExpressionStore as lookup<Expr>;
      setters[settername] = (self: any) => (arg: Expr) => {
        self[key] = arg;
      };
      serialize = (self) => {
        const part = oldSerialize(self);
        //@ts-expect-error not assignable
        part[key] = (self[key] as IExpressionStore).serialize;

        return part;
      };
      deserialize = (self, data) => {
        oldDeserialize(self, data);
        (self[key] as IExpressionStore).deserialize(data[key] as Expr);
      };
      deserPartial = (self, data) => {
        oldDeserPartial(self, data);
        if (data[key] !== undefined) {
          (self[key] as IExpressionStore).deserialize(data[key] as Expr);
        }
      };
    } else if (typeof defau === "boolean") {
      //@ts-expect-error not assignable
      props[key] = defau;
      setters[settername] = (self: any) => (arg: boolean) => {
        self[key] = arg;
      };
      serialize = (self) => {
        const part = oldSerialize(self);
        part[key] = self[key];
        return part;
      };
      deserialize = (self, data) => {
        oldDeserialize(self, data);
        self[key] = data[key];
      };
      deserPartial = (self, data) => {
        oldDeserPartial(self, data);
        if (data[key] !== undefined) {
          self[key] = data[key];
        }
      };
    }
  });

  const store = types
    .model(def.type, {
      type: types.literal(def.type),
      def: types.frozen<ConstraintDefinition<K>>(def),
      ...props
    } as Props<K>)
    .actions(
      (self) =>
        //@ts-expect-error the typing doesn't preserve through fromEntries()
        Object.fromEntries(
          Object.entries(setters).map(([key, val]) => [
            key as keyof ConstraintSetters<K>,
            val(self)
          ])
        ) as ConstraintSetters<K>
    )
    .views((self) => ({
      get serialize(): D {
        return {
          type: def.type,
          props: serialize(self) as D["props"]
        } as D;
      }
    }))
    .actions((self) => ({
      deserialize(ser: D) {
        deserialize(self, ser.props);
      },
      deserPartial(ser: Partial<D["props"]>) {
        deserPartial(self, ser);
      }
    }));
  //@ts-expect-error just force ts to acknowledge that it's correct
  return store as ConstraintDataStore<K>;
}

export const ConstraintDataObjects = Object.fromEntries(
  consts.map(<K extends ConstraintKey>(def: ConstraintDefinition<K>) => [
    def.type,
    createDataStore(def)
  ])
) as {
  [key in ConstraintKey]: ConstraintDataStore<key>;
};

export function defineCreateConstraintData<
  K extends ConstraintKey,
  D extends DataMap[K],
  P extends D["props"]
>(
  key: K,
  def: ConstraintDefinition<K>,
  vars: () => IVariables
): (data: Partial<P>) => (typeof ConstraintDataObjects)[K]["Type"] {
  return (data: Partial<P>) => {
    const snapshot: any = {};
    Object.keys(def.properties).forEach((key) => {
      const prop =
        def.properties[
          key as keyof PropertyDefinitionList<DataMap[K]["props"]>
        ];
      if (isExpr(prop.defaultVal)) {
        const exprProp = prop as ConstraintPropertyDefinition<Expr>;
        snapshot[key as keyof P] = vars().createExpression(
          exprProp.defaultVal,
          exprProp!.dimension.type
        );
      }
      // defaults for primitives are set in the store definition
    });
    const store = ConstraintDataObjects[key].create({ type: key, ...snapshot });
    //store.apply(data);
    return store;
  };
}
