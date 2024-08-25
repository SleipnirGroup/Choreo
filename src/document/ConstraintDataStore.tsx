import {
  IAnyModelType,
  IAnyType,
  IModelType,
  ISimpleType,
  IType,
  Instance,
  ModelCreationType2,
  ModelPropertiesDeclarationToProperties,
  types
} from "mobx-state-tree";
import {
  ConstraintData,
  ConstraintDefinition,
  ConstraintDefinitions,
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
import { Expr } from "./2025/DocumentTypes";

type lookup<T> = T extends Expr
  ? typeof ExpressionStore
  : T extends boolean
    ? boolean
    : never;

type Props<K extends ConstraintKey, D extends ConstraintData = DataMap[K]> = 
{ [propkey in keyof D["props"]]: lookup<D["props"][propkey]> } & {
  type: ISimpleType<D["type"]>;
  def: IType<
    ConstraintDefinition<K> | null | undefined,
    ConstraintDefinition<K>,
    ConstraintDefinition<K>
  >;
}
type DataStoreProps<K extends ConstraintKey, D extends ConstraintData = DataMap[K]> =  ModelPropertiesDeclarationToProperties<Props<K>>;
export type IConstraintDataStore<K extends ConstraintKey, D extends ConstraintData = DataMap[K]> = IModelType<
  DataStoreProps<K>,
  {
    [setterkey in keyof D["props"] as `set${Capitalize<string & setterkey>}`]: (
      arg: D["props"][setterkey]
    ) => void;
  } & {
    serialize: () => D;
    deserialize: (ser:D)=>void;
    deserPartial: (ser: Partial<D["props"]>)=>void;
  }
>;

export function asType<K extends ConstraintKey>(
  store: Instance<IConstraintDataStore<ConstraintKey>>
): Instance<IConstraintDataStore<K>> {
  return store as Instance<IConstraintDataStore<K>>;
}

function createDataStore<K extends ConstraintKey, D extends ConstraintData = DataMap[K]>(
  def: ConstraintDefinition<K>
): IConstraintDataStore<K> {
  // The object mapping the properties to ExpressionStore or to default primitives
  const props: Partial<Props<K>> = {};
  // The object of setters for primitives
  type Setter<U> = U extends any ? (self: any) => (arg: U) => void : never;
  type PropertySetter = Setter<ConstraintPropertyType>;
  const setters: { [key: string]: PropertySetter } = {};
  // The function to serialize into a data object
  let serialize: (self: any) => Partial<D["props"]> = (self) => ({});
  let deserialize: (self: any, data: D["props"]) => void = (self, data)=>{};
  let deserPartial: (self: any, data: Partial<D["props"]>) => void = (self, data)=>{};
  // Iterate through each property. based on the type of its default value, add the correct infrastructure
  Object.keys(def.properties).forEach((k) => {
    let key = k as string & keyof PropertyDefinitionList<D["props"]>;
    let defau = def.properties[key].defaultVal;
    let settername = "set" + key[0].toUpperCase() + key.slice(1);
    let oldSerialize = serialize;
    let oldDeserialize = deserialize;
    let oldDeserPartial = deserPartial;
    if (Array.isArray(defau)) {
      props[key] = ExpressionStore;
      setters[settername] = (self: any) => (arg: Expr) => {
        self[key] = arg;
      };
      serialize = (self) => {
        let part = oldSerialize(self);
        part[key] = (self[key] as IExpressionStore).serialize();

        return part;
      };
      deserialize = (self, data) => {
        oldDeserialize(self, data);
        (self[key] as IExpressionStore).deserialize(data[key]);
      }
      deserPartial = (self, data) => {
        oldDeserPartial(self, data);
        if (data[key] !== undefined) {
          (self[key] as IExpressionStore).deserialize(data[key]);
        }

      }
    } else if (typeof defau === "boolean") {
      props[key] = defau;
      setters[settername] = (self: any) => (arg: boolean) => {
        self[key] = arg;
      };
      serialize = (self) => {
        let part = oldSerialize(self);
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

      }
    }
  });

  let store = types
    .model(def.type, {
      type: types.literal(def.type),
      def: types.frozen<ConstraintDefinition<K>>(def),
      ...props
    } as Props<K>)
    .actions((self) =>
      Object.fromEntries(
        Object.entries(setters).map(([key, val]) => [key, val(self)])
      )
    )
    .views((self) => ({
      serialize(): D {
        return {
          type: def.type,
          props: serialize(self) as D["props"]
        } as D;
      },
      deserialize(ser: D) {
        console.log(ser);
        deserialize(self, ser.props);
      },
      deserPartial(ser: Partial<D["props"]>) {
        deserPartial(self, ser);
      }
    }));
  return store as IConstraintDataStore<K>;
}

export const ConstraintDataObjects = Object.fromEntries(consts.map(<K extends ConstraintKey>(def: ConstraintDefinition<K>) => [def.type, createDataStore(def)])) as {
  [key in ConstraintKey]: IConstraintDataStore<key>;
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
      let prop =
        def.properties[
          key as keyof PropertyDefinitionList<DataMap[K]["props"]>
        ];
      if (Array.isArray(prop.defaultVal)) {
        let exprProp = prop as ConstraintPropertyDefinition<Expr>;
        snapshot[key as keyof P] = vars().createExpression(
          exprProp.defaultVal,
          exprProp!.units
        );
      }
      // defaults for primitives are set in the store definition
    });
    let store = ConstraintDataObjects[key].create({ type: key, ...snapshot });
    //store.apply(data);
    return store;
  };
}
