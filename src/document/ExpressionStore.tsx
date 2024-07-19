import { EvalFunction, MathNode, OperatorNode, Unit } from "mathjs";
import { Instance, types } from "mobx-state-tree";
import {create, all} from "mathjs";
import { getDependencyTree, toJS, trace } from "mobx";

export const math = create(all);
const {
  add, subtract, multiply
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

},   {override:true})
export const Units = {
    Meter: math.unit("m"),
    Radian: math.unit("rad"),
    Unitless: math.unit("1")
}
type Evaluated = null|undefined|number|Unit;
type Evaluator = (arg: MathNode)=>Evaluated;
export const ExpressionStore = types.model( "ExpressionStore",
    {
        expr: types.frozen<MathNode>(),
        defaultUnit: types.frozen<Unit>(Units.Unitless)
    }
)
.volatile(self=>({
    evaluator: (()=>{console.error("Created an ExpressionStore outside of Variables"); return undefined;}) as Evaluator
})).actions(self=>{
    return {
    setEvaluator(ev: Evaluator) {
        self.evaluator = ev;
    }
}
})
.actions((self)=>({
    setNode(newNode:MathNode) {
        console.log("setting ", newNode.toString());
        self.expr = newNode;
    }
}))
.views((self)=>({
  get evaluate() : Evaluated {
    self.expr;
    console.log("eval", self.expr.toString());
    let result = self.evaluator(self.expr);
    console.log("dep", self.expr.toString(), Object.assign({}, getDependencyTree(self, "evaluate")));
    return result;
  }})).views((self)=>({
    toDefaultUnit() : Unit | undefined {
      self.expr;
      
        const result = self.evaluator(self.expr);
        console.log(self.expr, "to default unit = ", result)
        if (result === undefined || result === null) {return undefined;}
        if (typeof result === "number") {
          return math.unit(result, self.defaultUnit.toString());
        }
        return (math.unit(result.toString()).to(self.defaultUnit.toString()));
    },
    defaultUnitMagnitude() : number | undefined {
      self.expr;
      return this.toDefaultUnit()?.toNumber(self.defaultUnit.toString())
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

          newNode = addUnitToExpression(newNode, self.defaultUnit.toString());
          } else {
          let unit = self.defaultUnit;
          if (!newNumber.equalBase(unit)) {
            console.error("unit mismatch", unit);
            return undefined;
          }
          if (!isFinite(newNumber.value)) {
            console.error("failed to evaluate: ", newNumber.value, "is infinite");
            return undefined;
          }
        }
        return newNode;
    }
}));
export interface IExpressionStore
  extends Instance<typeof ExpressionStore> {}

// const ExprPose = types.model({
//     x: ExpressionStore,
//     y: ExpressionStore,
//     heading: types.maybe(ExpressionStore)
// })
// .views(self=>({
//   get expr(): MathNode {
//     let node: Record<string, MathNode> = {x: 
//       self.x.expr, y: self.y.expr};
//     if (self.heading !== undefined) {
//         node.heading = self.heading?.expr;
//     }
//     return new math.ObjectNode(node);
//   }
// }));
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
// export interface IExprPose extends Instance<typeof ExprPose> {}
export const Variables = types.model("Variables",
    {
        store: types.map(
            types.union(
                ExpressionStore,
                // ExprPose
            )
        )
    }
)
.views(self=>({
  get scope() {
    let vars: Map<string, any> = new Map();
    vars.set("m", math.unit("m"));
    for (let [key, val] of self.store.entries()) {
      vars.set(key, ()=>val.expr);
    }
    console.log(vars);
    return vars;
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
.views(self=>({
  Expression(expr: string, unit: math.Unit): IExpressionStore {
     
      let store = ExpressionStore.create({expr: math.parse(expr), defaultUnit: unit});
      store.setEvaluator((node)=>self.evaluate(node));
      return store;
  }
}))
.actions(self=>({

      // addTranslation(key:string) {
      //   self.store.set(key, {x: self.Expression("0 m", Units.Meter), y: self.Expression("0 m", Units.Meter)});
      // },
      // addPose(key:string) {
      //   self.store.set(key, ExprPose.create({
      //       x: self.Expression("0 m", Units.Meter),
      //       y: self.Expression("0 m", Units.Meter),
      //       heading: self.Expression("0 rad", Units.Radian)}));
      // },
      add(key:string, store: IExpressionStore) {
        self.store.set(key, store);
      },

      set (key: string){},
      get (key:string):Evaluated | Record<string,Evaluated> | undefined {
        console.trace("get", key)
        let entry = self.store.get(key) ?? undefined as IExpressionStore|undefined;
        if (entry == undefined) return undefined;
        return (entry as IExpressionStore).evaluate;
      },
   
      has (key:string) {
        return self.store.has(key);
      },
    
      keys () {
        return self.store.keys()
      },
    
      delete (key:string) {
        return self.store.delete(key)
      },
    
      clear () {
        return self.store.clear();
      }
}
));