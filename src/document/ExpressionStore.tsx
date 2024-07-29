import { BigNumber, ConstantNode, EvalFunction, FormatOptions, Fraction, MathJSON, MathNode, OperatorNode, Unit, UnitComponent, e, isNull } from "mathjs";
import { Instance, getEnv, types } from "mobx-state-tree";
import {create, all,} from "mathjs";
import { IReactionDisposer, autorun, getDependencyTree, toJS, trace } from "mobx";

export const math = create(all, {predictable:true});
const {
  add, subtract, multiply, divide
}= math;
math.import({
  add: math.typed('add', {
    'Node | OperatorNode | Unit, Node | OperatorNode | Unit': function (x:MathNode, y:MathNode) { return add(math.unit(x.toString()), math.unit(y.toString())) }, // <--- what goes in here??
    'any, any': add
  }),
  subtract: math.typed('subtract', {
    'Node | OperatorNode | Unit, Node | OperatorNode | Unit': function (x:MathNode, y:MathNode) { return subtract(math.unit(x.toString()), math.unit(y.toString())) }, // <--- what goes in here??
    'any, any': subtract
  }),
  multiply: math.typed('multiply', {
    'Node | OperatorNode | Unit, Node | OperatorNode | Unit': function (x:MathNode, y:MathNode) { return multiply(math.unit(x.toString()), math.unit(y.toString())) }, // <--- what goes in here??
    'any, any': multiply
  }),
  divide: math.typed('divide', {
    'Node | OperatorNode | Unit, Node | OperatorNode | Unit': function (x:MathNode, y:MathNode) { return divide(math.unit(x.toString()), math.unit(y.toString())) }, // <--- what goes in here??
    'any, any': divide
  }),

},   {override:true})

function addUnitToExpression(
  expression: math.MathNode,
  unit: string
): math.MathNode {
  const unitNode = math.parse(unit);
  return new math.OperatorNode(
    "*",
    "multiply",
    [expression, unitNode],
    true
  );
}

//@ts-expect-error
const isAlphaOriginal = Unit.isValidAlpha
//@ts-expect-error
math.Unit.isValidAlpha = function (c) {
  return isAlphaOriginal(c) || c=='#'
}
export const Units = {
    Meter: math.unit("m"),
    MeterPerSecond: math.unit("m/s"),
    Radian: math.unit("rad"),
    RadianPerSecond: math.unit("rad/s"),
    KgM2: math.unit("kg m^2"),
    Newton: math.unit("N"),
    Kg: math.unit("kg"),
    RPM: math.createUnit("rpm", "1 cycle/min")
}
export type Evaluated = null|undefined|number|Unit;
type Evaluator = (arg: MathNode)=>Evaluated;
export type SerialExpr = {
  expr: string,
  value: number
}
export const ExpressionStore = types.model( "ExpressionStore",
    {
        expr: types.frozen<MathNode>(),
        defaultUnit: types.maybe(types.frozen<Unit>())
    }
)
.volatile(self=>({
    value: 0,
    getScope: ()=>{console.error("Evaluating without variables!", self.toString()); return new Map<string, any>();}
}))
.actions((self)=>({
    setScopeGetter(getter: ()=>Map<string, any>) {
      self.getScope = getter;
    },
    set(newNode:MathNode|number) {
        if (typeof newNode === "number") {
          if (self.defaultUnit === undefined) {
            self.expr = new ConstantNode(newNode);
          } else {
            self.expr = math.parse(math.unit(newNode, self.defaultUnit.toString()).toString());
          }
          return;
        }
        console.log("setting ", JSON.stringify(newNode));
        self.expr = newNode;
    },
    setValue(value:number) {
      self.value = value;
    }
}))
.views(self=>({
  evaluator(node: MathNode) : Evaluated {
    let scope = self.getScope() ?? (()=>{console.error("Evaluating without variables!"); return undefined;}) as Evaluator;
    let result = node.evaluate(scope) ?? undefined;
    if (result["isNode"]) {
      result = (result as MathNode).evaluate(scope);
    }
    return result;
  },
  serialize() : SerialExpr {
    return {
      expr: self.expr.toString(),
      value: self.value
    }
  },
  deserialize(serial: SerialExpr) {
    self.expr = math.parse(serial.expr);
  }
}))
.views((self)=>({
  get evaluate() : Evaluated {
    return self.evaluator(self.expr);
  }})).views((self)=>({
    get asScope() {
      return ()=>self.expr;
    },
    toDefaultUnit() : Unit | number | undefined {

        self.expr;
      
        const result = self.evaluate;
        if (result === undefined || result === null) {return undefined}
        if (typeof result === "number") {
          if (self.defaultUnit === undefined) {
            return result;
          }
          console.error("unit expression", self.expr.toString(), "evaluated to number")
          return math.unit(result, self.defaultUnit.toString());
        }
        if (self.defaultUnit === undefined) {
          console.error("number expression", self.expr.toString(), "evaluated to unit")
          return undefined;
        }
        return (math.unit(result.toString()).to(self.defaultUnit!.toString()));
    },
    get defaultUnitMagnitude() : number | undefined {
      self.expr;
      let defaultUnit = this.toDefaultUnit();
      if (typeof defaultUnit === "number") {
        return defaultUnit;
      }
      return defaultUnit?.toNumber(self.defaultUnit!.toString())
    },
    validate(newNode: MathNode){
        try {
          console.log("new node: " + newNode.toString());
        } catch {
          console.error("failed to evaluate");
          return undefined;
        }
        let newNumber: undefined | null | number | Unit;
        try {
          newNumber = self.evaluator(newNode);
          console.log("val: ", newNumber);
        } catch (e) {
            console.error("failed to evaluate", e);
          return undefined;
        }
        if (newNumber === undefined || newNumber === null) {
            console.error("evaluated to undefined or null");
          return undefined;
        }
        if (typeof newNumber ==="number") {
          if (!isFinite(newNumber)) {
            console.error("failed to evaluate: ", newNumber, "is infinite");
            return undefined;
          }
          if (self.defaultUnit !== undefined) {
            return addUnitToExpression(newNode, self.defaultUnit.toString());
          }
          return newNode;
        }
        // newNumber is Unit
        let unit = self.defaultUnit;
        if (unit === undefined) {
          console.error("failed to evaluate: ", newNumber, "is unit on unitless expr");
          return undefined;
        }
        if (!newNumber.equalBase(unit)) {
          console.error("unit mismatch", unit);
          return undefined;
        }
        if (isNull(newNumber.value)) {
          console.error("valueless unit", unit);
          return undefined;
        }
        if (!isFinite(newNumber.value)) {
          console.error("failed to evaluate: ", newNumber.value, "is infinite");
          return undefined;
        }
        return newNode;
    }
}))
.volatile(self=>{
  let recalcDispose: IReactionDisposer;
  return {
    afterCreate: ()=>{
      recalcDispose = autorun(()=>{
        try{
        let value = (self.defaultUnitMagnitude);
        if (value !== undefined) {
          self.setValue(value);
        }
      } catch (e) {
        console.log(self.expr.toString());
        throw(e);
      }
      });
    },
    beforeDestroy: ()=>{
      recalcDispose();
    }
  }
});
export interface IExpressionStore
  extends Instance<typeof ExpressionStore> {}

const ExprPose = types.model({
    x: ExpressionStore,
    y: ExpressionStore,
    heading: types.maybe(ExpressionStore)
})
.views(self=>({
  get asScope(): Record<string, ()=>MathNode> {
    let node: Record<string, ()=>MathNode> = {x: 
      ()=>self.x.expr, y: ()=>self.y.expr};
    if (self.heading !== undefined) {
        node.heading = ()=>self.heading!.expr;
    }
    return node;
  }
}));
// function isSafeProperty(object, prop) {
//     if (!object || typeof object !== 'object') {
//       return false;
//     }
//     // UNSAFE: inherited from Object prototype
//     // e.g constructor
//     if (prop in Object.prototype) {
//       // 'in' is used instead of hasOwnProperty for nodejs v0.10
//       // which is inconsistent on root prototypes. It is safe
//       // here because Object.prototype is a root object
//       return false;
//     }
//     // UNSAFE: inherited from Function prototype
//     // e.g call, apply
//     if (prop in Function.prototype) {
//       // 'in' is used instead of hasOwnProperty for nodejs v0.10
//       // which is inconsistent on root prototypes. It is safe
//       // here because Function.prototype is a root object
//       return false;
//     }
//     return true;
//   }
export interface IExprPose extends Instance<typeof ExprPose> {}
type Pose = {x: number, y: number, heading: number};
export const Variables = types.model("Variables",
    {
        store: types.map(
                ExpressionStore
            )
        ,
        poses: types.map(
          ExprPose
        )
    }
)
.views(self=>({
  get scope() {
    let vars: Map<string, any> = new Map();
    //vars.set("m", math.unit("m"));
    for (let [key, val] of self.store.entries()) {
      vars.set(key, val.asScope);
    }
    for (let [key, val] of self.poses.entries()) {
      vars.set(key, val.asScope);
    }
    console.log(vars);
    return vars;
  }
}))
.actions(self=>({
  createExpression(expr: string|number, unit?: math.Unit): IExpressionStore {
     let store: IExpressionStore;
    if (typeof expr === "number") {
      if (unit === undefined) {
        store = ExpressionStore.create({expr: new ConstantNode(expr)})
      } else {
        store = ExpressionStore.create({expr: addUnitToExpression(new math.ConstantNode(expr), unit.toString()), defaultUnit: unit, });
      }
      
    }
    else {store = ExpressionStore.create({expr: math.parse(expr), defaultUnit: unit, });}
    store.setScopeGetter(()=>self.scope);
    
    return store;
  }
}))
.views(self=>({
  evaluate(node: MathNode) : Evaluated {
      
      let result = node.evaluate(self.scope) ?? undefined;
      if (result["isNode"]) {
        result = (result as MathNode).evaluate(self.scope);
      }
      return result;
  }
}))
.actions(self=>({

      // addTranslation(key:string) {
      //   self.store.set(key, {x: self.Expression("0 m", Units.Meter), y: self.Expression("0 m", Units.Meter)});
      // },
      
      addPose(key:string, pose?: Pose) {
        self.poses.set(key, ExprPose.create({
            x: self.createExpression(pose?.x ?? 0, Units.Meter),
            y: self.createExpression(pose?.y ?? 0, Units.Meter),
            heading: self.createExpression(pose?.heading ?? 0, Units.Radian)}));
      },
      add(key:string, expr: string|number, defaultUnit: Unit) {
        self.store.set(key, self.createExpression(expr, defaultUnit));
      }
}
));
export interface IVariables extends Instance<typeof Variables>{}