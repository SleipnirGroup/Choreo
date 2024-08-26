import { ConstantNode, MathNode, Unit, all, create, isNull } from "mathjs";
import { IReactionDisposer, autorun } from "mobx";
import { Instance, types } from "mobx-state-tree";
import {
  PoseVariable as DocPoseVariable,
  Variables as DocVariables,
  Expr
} from "./2025/DocumentTypes";

export const math = create(all, { predictable: true });
const { add, subtract, multiply, divide } = math;
math.import(
  {
    add: math.typed("add", {
      "Node | OperatorNode | Unit, Node | OperatorNode | Unit": function (
        x: MathNode,
        y: MathNode
      ) {
        return add(math.unit(x.toString()), math.unit(y.toString()));
      }, // <--- what goes in here??
      "any, any": add
    }),
    subtract: math.typed("subtract", {
      "Node | OperatorNode | Unit, Node | OperatorNode | Unit": function (
        x: MathNode,
        y: MathNode
      ) {
        return subtract(math.unit(x.toString()), math.unit(y.toString()));
      }, // <--- what goes in here??
      "any, any": subtract
    }),
    multiply: math.typed("multiply", {
      "Node | OperatorNode | Unit, Node | OperatorNode | Unit": function (
        x: MathNode,
        y: MathNode
      ) {
        return multiply(math.unit(x.toString()), math.unit(y.toString()));
      }, // <--- what goes in here??
      "any, any": multiply
    }),
    divide: math.typed("divide", {
      "Node | OperatorNode | Unit, Node | OperatorNode | Unit": function (
        x: MathNode,
        y: MathNode
      ) {
        return divide(math.unit(x.toString()), math.unit(y.toString()));
      }, // <--- what goes in here??
      "any, any": divide
    })
  },
  { override: true }
);

function addUnitToExpression(
  expression: math.MathNode,
  unit: string
): math.MathNode {
  const unitNode = math.parse(unit);
  return new math.OperatorNode("*", "multiply", [expression, unitNode], true);
}

const isAlphaOriginal = Unit.isValidAlpha;
math.Unit.isValidAlpha = function (c) {
  return isAlphaOriginal(c) || c == "#";
};
export const Units = {
  Second: math.unit("s"),
  Meter: math.unit("m"),
  MeterPerSecond: math.unit("m/s"),
  MeterPerSecondSquared: math.unit("m/s^2"),
  Radian: math.unit("rad"),
  RadianPerSecond: math.unit("rad/s"),
  KgM2: math.unit("kg m^2"),
  Newton: math.unit("N"),
  Kg: math.unit("kg"),
  RPM: math.createUnit("RPM", "1 cycle/min", { aliases: ["rpm"] })
};
// not sure why the alias above doesn't work
math.createUnit("rpm", "1 RPM");

export type Evaluated = null | undefined | number | Unit;
type Evaluator = (arg: MathNode) => Evaluated;
export const ExpressionStore = types
  .model("ExpressionStore", {
    expr: types.frozen<MathNode>(),
    defaultUnit: types.maybe(types.frozen<Unit>())
  })
  .volatile((self) => ({
    value: 0,
    getScope: () => {
      console.error("Evaluating without variables!", self.toString());
      return new Map<string, any>();
    }
  }))
  .actions((self) => ({
    deserialize(serial: Expr) {
      self.expr = math.parse(serial[0]);
      self.value = serial[1];
      return self;
    },
    setScopeGetter(getter: () => Map<string, any>) {
      self.getScope = getter;
    },
    set(newNode: MathNode | number) {
      if (typeof newNode === "number") {
        if (self.defaultUnit === undefined) {
          self.expr = new ConstantNode(newNode);
        } else {
          self.expr = math.parse(
            math.unit(newNode, self.defaultUnit.toString()).toString()
          );
        }
        return;
      }

      self.expr = newNode;
    },
    setValue(value: number) {
      self.value = value;
    }
  }))
  .views((self) => ({
    evaluator(node: MathNode): Evaluated {
      const scope =
        self.getScope() ??
        ((() => {
          console.error("Evaluating without variables!");
          return undefined;
        }) as Evaluator);
      let result = node.evaluate(scope) ?? undefined;
      if (result["isNode"]) {
        result = (result as MathNode).evaluate(scope);
      }
      return result;
    },
    serialize(): Expr {
      return [self.expr.toString(), self.value];
    }
  }))
  .views((self) => ({
    get evaluate(): Evaluated {
      return self.evaluator(self.expr);
    }
  }))
  .views((self) => ({
    get asScope() {
      return () => self.expr;
    },
    toDefaultUnit(): Unit | number | undefined {
      //eslint-disable-next-line @typescript-eslint/no-unused-expressions
      self.expr;

      const result = self.evaluate;
      if (result === undefined || result === null) {
        return undefined;
      }
      if (typeof result === "number") {
        if (self.defaultUnit === undefined) {
          return result;
        }
        console.error(
          "unit expression",
          self.expr.toString(),
          "evaluated to number"
        );
        return math.unit(result, self.defaultUnit.toString());
      }
      if (self.defaultUnit === undefined) {
        console.error(
          "number expression",
          self.expr.toString(),
          "evaluated to unit"
        );
        return undefined;
      }
      return math.unit(result.toString()).to(self.defaultUnit!.toString());
    },
    get defaultUnitMagnitude(): number | undefined {
      //eslint-disable-next-line @typescript-eslint/no-unused-expressions
      self.expr;
      const defaultUnit = this.toDefaultUnit();
      if (typeof defaultUnit === "number") {
        return defaultUnit;
      }
      return defaultUnit?.toNumber(self.defaultUnit!.toString());
    },
    validate(newNode: MathNode) {
      let newNumber: undefined | null | number | Unit;
      try {
        newNumber = self.evaluator(newNode);
      } catch (e) {
        console.error("failed to evaluate", e);
        return undefined;
      }
      if (newNumber === undefined || newNumber === null) {
        console.error("evaluated to undefined or null");
        return undefined;
      }
      if (typeof newNumber === "number") {
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
      const unit = self.defaultUnit;
      if (unit === undefined) {
        console.error(
          "failed to evaluate: ",
          newNumber,
          "is unit on unitless expr"
        );
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
  .volatile((self) => {
    let recalcDispose: IReactionDisposer;
    return {
      afterCreate: () => {
        recalcDispose = autorun(() => {
          //eslint-disable-next-line no-useless-catch
          try {
            const value = self.defaultUnitMagnitude;
            if (value !== undefined) {
              self.setValue(value);
            }
          } catch (e) {
            throw e;
          }
        });
      },
      beforeDestroy: () => {
        recalcDispose();
      }
    };
  });
export type IExpressionStore = Instance<typeof ExpressionStore>;

const ExprPose = types
  .model({
    x: ExpressionStore,
    y: ExpressionStore,
    heading: ExpressionStore
  })
  .views((self) => ({
    get asScope(): Record<string, () => MathNode> {
      const node: Record<string, () => MathNode> = {
        x: () => self.x.expr,
        y: () => self.y.expr,
        heading: () => self.heading.expr
      };
      return node;
    },
    serialize(): DocPoseVariable {
      return {
        x: self.x.serialize(),
        y: self.y.serialize(),
        heading: self.heading.serialize()
      };
    }
  }))
  .actions((self) => ({
    deserialize(pose: DocPoseVariable) {
      self.x.deserialize(pose.x);
      self.y.deserialize(pose.y);
      self.heading.deserialize(pose.heading);
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
export type IExprPose = Instance<typeof ExprPose>;
type Pose = { x: number; y: number; heading: number };
export const Variables = types
  .model("Variables", {
    expressions: types.map(ExpressionStore),
    poses: types.map(ExprPose)
  })
  .views((self) => ({
    serialize(): DocVariables {
      const out: DocVariables = {
        expressions: {},
        poses: {}
      };
      for (const entry of self.expressions.entries()) {
        out.expressions[entry[0]] = {
          unit: "Meter",
          var: (entry[1] as IExpressionStore).serialize()
        };
      }

      for (const entry of self.poses.entries()) {
        out.poses[entry[0]] = entry[1].serialize();
      }
      return out;
    },
    get scope() {
      const vars: Map<string, any> = new Map();
      //vars.set("m", math.unit("m"));
      for (const [key, val] of self.expressions.entries()) {
        vars.set(key, val.asScope);
      }
      for (const [key, val] of self.poses.entries()) {
        vars.set(key, val.asScope);
      }
      return vars;
    }
  }))
  .actions((self) => ({
    createExpression(
      expr: string | number | Expr,
      unit?: math.Unit
    ): IExpressionStore {
      let store: IExpressionStore;
      if (typeof expr === "number") {
        if (unit === undefined) {
          store = ExpressionStore.create({ expr: new ConstantNode(expr) });
        } else {
          store = ExpressionStore.create({
            expr: addUnitToExpression(
              new math.ConstantNode(expr),
              unit.toString()
            ),
            defaultUnit: unit
          });
        }
      } else if (Array.isArray(expr)) {
        store = ExpressionStore.create({
          expr: math.parse(expr[0]),
          defaultUnit: unit
        });
        store.deserialize(expr);
      } else {
        store = ExpressionStore.create({
          expr: math.parse(expr),
          defaultUnit: unit
        });
      }
      store.setScopeGetter(() => self.scope);

      return store;
    }
  }))
  .views((self) => ({
    evaluate(node: MathNode): Evaluated {
      let result = node.evaluate(self.scope) ?? undefined;
      if (result["isNode"]) {
        result = (result as MathNode).evaluate(self.scope);
      }
      return result;
    }
  }))
  .actions((self) => ({
    // addTranslation(key:string) {
    //   self.store.set(key, {x: self.Expression("0 m", Units.Meter), y: self.Expression("0 m", Units.Meter)});
    // },

    addPose(key: string, pose?: Pose) {
      self.poses.set(
        key,
        ExprPose.create({
          x: self.createExpression(pose?.x ?? 0, Units.Meter),
          y: self.createExpression(pose?.y ?? 0, Units.Meter),
          heading: self.createExpression(pose?.heading ?? 0, Units.Radian)
        })
      );
    },
    add(key: string, expr: string | number, defaultUnit: Unit) {
      self.expressions.set(key, self.createExpression(expr, defaultUnit));
    },
    deserialize(vars: DocVariables) {
      for (const entry of Object.entries(vars.expressions)) {
        self.expressions.set(
          entry[0],
          self.createExpression(entry[1].var[0], Units[entry[1].unit])
        );
      }

      for (const entry of Object.entries(vars.poses)) {
        self.poses.set(
          entry[0],
          ExprPose.create({
            x: self.createExpression(entry[1].x[0] ?? "0 m", Units.Meter),
            y: self.createExpression(entry[1].y[0] ?? "0 m", Units.Meter),
            heading: self.createExpression(
              entry[1].heading[0] ?? "0 rad",
              Units.Radian
            )
          })
        );
      }
    }
  }));
export type IVariables = Instance<typeof Variables>;
