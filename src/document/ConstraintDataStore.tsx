import { IAnyModelType, IAnyType, IModelType, ISimpleType, Instance, ModelCreationType2, ModelPropertiesDeclarationToProperties, types } from "mobx-state-tree";
import { ConstraintData, ConstraintDefinition, ConstraintDefinitions, ConstraintKey, ConstraintPropertyDefinition, ConstraintPropertyType, DataMap, PropertyDefinitionList, consts } from "./ConstraintDefinitions";
import { ExpressionStore, IExpressionStore, IVariables } from "./ExpressionStore";
import { Expr } from "./2025/DocumentTypes";

//interface Registry {[key:string]: [ConstraintPropertyType, IAnyType]}
interface LookupType {
    bool: [boolean, ISimpleType<boolean>],
    expr: [Expr, typeof ExpressionStore]
}
interface LookupInstance {
    bool: [boolean, boolean],
    expr: [Expr, IExpressionStore]
}

type lookup<T> = (T extends Expr ? typeof ExpressionStore : T extends boolean ? boolean : never);

type DataStoreProps<D extends ConstraintData> = ModelPropertiesDeclarationToProperties<
{[propkey in keyof D["props"]]: lookup<D["props"][propkey]>;} & {type: ISimpleType<D["type"]>}
>
export type IConstraintDataStore<D extends ConstraintData> = IModelType<
    DataStoreProps<D>, 
    {[setterkey in keyof D["props"] as `set${Capitalize<string & setterkey>}`]: (arg: D["props"][setterkey])=>void;
} & {
    serialize: ()=>D
}>;


function createDataStore<D extends ConstraintData>(def: ConstraintDefinition<D>): IConstraintDataStore<D> {
    
    // The object mapping the properties to ExpressionStore or to default primitives
    type Props = { [key in keyof PropertyDefinitionList<D["props"]>]: boolean | typeof ExpressionStore; };
    const props: Partial<Props> = {};
    // The object of setters for primitives 
    type Setter<U> = U extends any ? (self: any) => ((arg: U) => void) : never;
    type PropertySetter = Setter<ConstraintPropertyType>
    const setters: { [key: string]: PropertySetter; } = {}
    // The function to serialize into a data object
    let serialize: (self: any) => Partial<D["props"]> = (self) => ({});
    // Iterate through each property. based on the type of its default value, add the correct infrastructure
    Object.keys(def.properties).forEach((k) => {
      let key = k as string & keyof PropertyDefinitionList<D["props"]>;
      let defau = def.properties[key].defaultVal;
      let settername = "set" + key[0].toUpperCase() + key.slice(1);
      if (Array.isArray(defau)) {
        props[key] = ExpressionStore;
        serialize = (self) => {
          let part = serialize(self);
          part[key] = (self[key] as IExpressionStore).serialize();
          setters[settername] = (self: any) => ((arg: Expr) => { self[key] = arg });
          return part;
        }
      } else if (typeof defau === "boolean") {
        props[key] = defau;
        setters[settername] = (self: any) => ((arg: boolean) => { self[key] = arg });
        serialize = (self) => {
          let part = serialize(self);
          part[key] = (self[key]);
          return part;
        }
      }
    });
  
    let store = types.model(def.type, props as Props).props({type: types.literal(def.type)})
      .actions(self =>
        Object.fromEntries(Object.entries(setters).map(([key, val]) => [key, val(self)]))
      )
      .views(self => ({
        serialize(): D {
          return {
            type: def.type,
            props: serialize(self) as D["props"]
          } as D;
        }
      })
      );
    return store as IConstraintDataStore<D>;
  }
  
  
  export const ConstraintDataObjects: {
    [key in ConstraintKey]: IConstraintDataStore<DataMap[key]>
  } = Object.fromEntries(consts.map(def => [def.type, createDataStore(def)]));

  export function defineCreateConstraintData<K extends ConstraintKey, D extends DataMap[K], P extends D["props"]>(key: K, def: ConstraintDefinition<D>, vars: () => IVariables):
  (data:Partial<P>)=>(typeof ConstraintDataObjects[K])["Type"] {

    return (data: Partial<P>) => {
      const snapshot:any = {};
      Object.keys(def.properties).forEach((key) => {
        let prop = def.properties[key as keyof PropertyDefinitionList<DataMap[K]["props"]>];
        if (Array.isArray(prop.defaultVal)) {
          let exprProp = prop as ConstraintPropertyDefinition<Expr>;
          snapshot[key as keyof P] = vars().createExpression(exprProp.defaultVal, exprProp!.units);
        }
        // defaults for primitives are set in the store definition
      });
      let store = ConstraintDataObjects[key].create(
        snapshot
      );
      //store.apply(data);
      return store;
        
    }
  }
  