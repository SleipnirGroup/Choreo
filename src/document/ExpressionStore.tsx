import {
  KeyboardArrowRight,
  KeyboardDoubleArrowRight,
  Numbers,
  RotateLeftOutlined,
  Straighten,
  SyncOutlined,
  TimerOutlined
} from "@mui/icons-material";
import { Tooltip } from "@mui/material";
import {
  AccessorNode,
  ConstantNode,
  FunctionNode,
  IndexNode,
  MathNode,
  MathType,
  SymbolNode,
  Unit,
  all,
  create,
  isNode,
  isNull,
  isUnit
} from "mathjs";
import { IReactionDisposer, reaction, untracked } from "mobx";
import { Instance, detach, getEnv, types } from "mobx-state-tree";
import Angle from "../assets/Angle";
import Mass from "../assets/Mass";
import MoI from "../assets/MoI";
import Torque from "../assets/Torque";
import Waypoint from "../assets/Waypoint";
import {
  PoseVariable as DocPoseVariable,
  Variables as DocVariables,
  Expr,
  isExpr
} from "./2025/DocumentTypes";
import { Env } from "./DocumentManager";
import { tracing } from "./tauriTracing";

export const math = create(all, { predictable: true });

function isSymbolNode(node: MathNode): node is SymbolNode {
  return node.type === "SymbolNode";
}
function isFunctionNode(node: MathNode): node is FunctionNode {
  return node.type === "FunctionNode";
}
function isAccessorNode(node: MathNode): node is AccessorNode {
  return node.type === "AccessorNode";
}
function isConstantNode(node: MathNode): node is ConstantNode {
  return node.type === "ConstantNode";
}

function addUnitToExpression(
  expression: math.MathNode,
  unit?: string
): math.MathNode {
  if (unit === undefined) return expression;
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
  RadianPerSecondSquared: math.unit("rad/s^2"),
  KgM2: math.unit("kg m^2"),
  Newton: math.unit("N"),
  NewtonMeter: math.unit("N*m"),
  Kg: math.unit("kg"),
  RPM: math.createUnit("RPM", "1 cycle/min", { aliases: ["rpm"] })
};
// not sure why the alias above doesn't work
math.createUnit("rpm", "1 RPM");

export const DimensionNames = [
  "Number",
  "Length",
  "LinVel",
  "LinAcc",
  "Angle",
  "AngVel",
  "AngAcc",
  "Time",
  "Mass",
  "Torque",
  "MoI"
] as const;
export type DimensionName = (typeof DimensionNames)[number];
export type Dimension<T> = {
  type: T;
  name: string;
  unit?: Unit;
  icon: () => JSX.Element;
};
export const Dimensions = {
  Number: {
    type: "Number",
    name: "Number",
    unit: undefined,
    icon: () => <Numbers></Numbers>
  },
  Length: {
    type: "Length",
    name: "Length",
    unit: Units.Meter,
    icon: () => <Straighten></Straighten>
  },
  Angle: {
    type: "Angle",
    name: "Angle",
    unit: Units.Radian,
    icon: () => <Angle></Angle>
  },
  LinVel: {
    type: "LinVel",
    name: "Linear Velocity",
    unit: Units.MeterPerSecond,
    icon: () => <KeyboardArrowRight />
  },
  LinAcc: {
    type: "LinAcc",
    name: "Linear Acceleration",
    unit: Units.MeterPerSecondSquared,
    icon: () => <KeyboardDoubleArrowRight />
  },
  AngVel: {
    type: "AngVel",
    name: "Angular Velocity",
    unit: Units.RadianPerSecond,
    icon: () => <SyncOutlined />
  },
  AngAcc: {
    type: "AngAcc",
    name: "Angular Acceleration",
    unit: Units.RadianPerSecondSquared,
    icon: () => <RotateLeftOutlined />
  },
  Time: {
    type: "Time",
    name: "Time",
    unit: Units.Second,
    icon: () => <TimerOutlined></TimerOutlined>
  },
  Mass: {
    type: "Mass",
    name: "Mass",
    unit: Units.Kg,
    icon: () => <Mass></Mass>
  },
  MoI: {
    type: "MoI",
    name: "Moment of Inertia",
    unit: Units.KgM2,
    icon: () => <MoI></MoI>
  },
  Torque: {
    name: "Torque",
    unit: Units.NewtonMeter,
    icon: () => <Torque></Torque>,
    type: "Torque"
  }
} as const satisfies {
  [key in DimensionName]: Dimension<key>;
};
export const DimensionNamesExt = [...DimensionNames, "Pose"] as const;
export type DimensionNameExt = (typeof DimensionNamesExt)[number];
export const DimensionsExt = {
  ...Dimensions,
  Pose: {
    type: "Pose",
    name: "Pose",
    unit: undefined,
    icon: () => (
      <Tooltip disableInteractive title="Pose">
        <Waypoint></Waypoint>
      </Tooltip>
    )
  }
} as const satisfies {
  [key in DimensionNameExt]: Dimension<key>;
};

export type Evaluated = MathType | null | undefined;
type Evaluator = (arg: MathNode) => Evaluated;
export const ExpressionStore = types
  .model("ExpressionStore", {
    expr: types.frozen<MathNode>(),
    dimension: types.frozen<DimensionName>()
  })
  .volatile((self) => ({
    tempDisableRecalc: false,
    value: 0,
    getScope: () => {
      // intentionally not typing it here, so that there's not a circular type dependency
      const env = getEnv(self);
      if (env.vars === undefined) {
        tracing.error("Evaluating without variables!", self.toString());
        return new Map<string, any>();
      }
      const scope = env.vars().scope;
      return scope;
    }
  }))
  .views((self) => ({
    get defaultUnit(): Unit | undefined {
      return Dimensions[self.dimension]?.unit;
    }
  }))
  .actions((self) => ({
    findReplaceVariable(find: string, replace: string) {
      self.expr = self.expr.transform(function (node, _path, _parent) {
        if (isSymbolNode(node) && node.name === find) {
          const clone = (node as SymbolNode).clone();
          clone.name = replace;
          return clone;
        } else {
          return node;
        }
      });
    },
    deserialize(serial: Expr) {
      self.expr = math.parse(serial.exp);
      self.value = serial.val;
      return self;
    },
    // WARNING: should not be generally used. This is for cases
    // where the user needs to change the unit for validation
    setDimension(newDefault: DimensionName) {
      self.dimension = newDefault;
    },
    setScopeGetter(getter: () => Map<string, any>) {
      self.getScope = getter;
    },
    set(newNode: MathNode | number) {
      if (typeof newNode === "number") {
        self.tempDisableRecalc = true;
        if (self.defaultUnit === undefined) {
          self.expr = new ConstantNode(newNode);
          this.setValue(newNode);
        } else {
          self.expr = math.parse(
            math.unit(newNode, self.defaultUnit.toString()).toString()
          );
          this.setValue(newNode);
        }
        return;
      }

      self.expr = newNode;
    },
    setValue(value: number) {
      self.value = value;
    },
    setTempDisableRecalc(disable: boolean) {
      self.tempDisableRecalc = disable;
    }
  }))
  .views((self) => ({
    evaluator(node: MathNode): MathType {
      // TODO investigate whether this should be untracked
      const scope: Map<string, any> =
        self.getScope() ??
        ((() => {
          tracing.error("Evaluating without variables!");
          return undefined;
        }) as Evaluator);
      scope.keys();
      // turn symbol variables into function variables if they're found in scope
      const transformed = node.transform((innerNode, path, parent) => {
        if (
          isSymbolNode(innerNode) &&
          typeof scope.get(innerNode.name) === "function" &&
          (parent === null || !isFunctionNode(parent) || path !== "fn")
        ) {
          return new math.FunctionNode(innerNode, []);
        }
        if (isAccessorNode(innerNode)) {
          if (!isFunctionNode(parent) || path !== "fn") {
            const accessorNode = innerNode;
            const { object, index } = accessorNode;
            if (isSymbolNode(object) && index.isIndexNode) {
              const symbol = object as SymbolNode;
              const idx = index as IndexNode;
              if (isConstantNode(idx.dimensions[0])) {
                const constant = idx.dimensions[0];
                if (
                  typeof scope.get(symbol.name) === "object" &&
                  typeof scope.get(symbol.name)?.[constant.value] === "function"
                ) {
                  return new FunctionNode(innerNode, []);
                }
              }
            }
          }
        }
        return innerNode;
      });
      const result = transformed.evaluate(scope) ?? undefined;

      return result;
    },
    get serialize(): Expr {
      return {
        exp: self.expr.toString(),
        val: self.value
      };
    }
  }))
  .views((self) => ({
    get evaluate(): MathType {
      const result = self.evaluator(self.expr);
      return result;
    }
  }))
  .views((self) => ({
    get asScope() {
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        self.value;

        const expr = untracked(() => {
          return self.evaluate;
        });
        return expr;
      };
    },
    get toDefaultUnit(): Unit | number | undefined {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      self.expr;

      const result = self.evaluate;
      if (result === undefined || result === null) {
        return undefined;
      }
      if (typeof result === "number") {
        if (self.defaultUnit === undefined) {
          return result;
        }
        tracing.error(
          "unit expression",
          self.expr.toString(),
          "evaluated to number"
        );
        return math.unit(result, self.defaultUnit.toString());
      }
      if (self.defaultUnit === undefined) {
        tracing.error(
          "number expression",
          self.expr.toString(),
          "evaluated to unit"
        );
        return undefined;
      }
      return math.unit(result.toString()).to(self.defaultUnit!.toString());
    },
    get defaultUnitMagnitude(): number | undefined {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      self.expr;

      const defaultUnit = this.toDefaultUnit;
      if (typeof defaultUnit === "number") {
        return defaultUnit;
      }
      return defaultUnit?.toNumber(self.defaultUnit!.toString());
    },
    validate(newNode: MathNode): MathNode | undefined {
      let newNumber: MathType;
      try {
        newNumber = self.evaluator(newNode);
      } catch (e) {
        tracing.error("failed to evaluate", e, newNode);
        return undefined;
      }
      if (newNumber === undefined || newNumber === null) {
        tracing.error("evaluated to undefined or null");
        return undefined;
      }
      if (typeof newNumber === "number") {
        if (!isFinite(newNumber)) {
          tracing.error("failed to evaluate: ", newNumber, "is infinite");
          return undefined;
        }
        if (self.defaultUnit !== undefined) {
          return addUnitToExpression(newNode, self.defaultUnit.toString());
        }
        return newNode;
      }
      if (isNode(newNumber)) {
        return this.validate(newNumber);
      }
      if (!isUnit(newNumber)) {
        tracing.error("not unit:", newNumber);
        return undefined;
      }
      // newNumber is Unit
      // unit that's just a number
      if (newNumber.dimensions.every((d) => d == 0)) {
        if (self.defaultUnit !== undefined) {
          return addUnitToExpression(newNode, self.defaultUnit.toString());
        }
      }
      const unit = self.defaultUnit;
      if (unit === undefined) {
        tracing.error(
          "failed to evaluate: ",
          newNumber,
          "is unit on unitless expr"
        );
        return undefined;
      }
      if (!newNumber.equalBase(unit)) {
        tracing.error("unit mismatch", unit);
        return undefined;
      }
      if (isNull(newNumber.value)) {
        tracing.error("valueless unit", unit);
        return undefined;
      }
      if (!isFinite(newNumber.value)) {
        tracing.error("failed to evaluate: ", newNumber.value, "is infinite");
        return undefined;
      }
      return newNode;
    },
    get valid(): boolean {
      return this.validate(self.expr) !== undefined;
    }
  }))
  .volatile((self) => {
    let recalcDispose: IReactionDisposer;
    return {
      afterCreate: () => {
        recalcDispose = reaction(
          () => {
            if (!self.tempDisableRecalc) {
              try {
                const value = self.defaultUnitMagnitude;
                if (value !== undefined) {
                  return value;
                }
              } finally {
                self.setTempDisableRecalc(false);
              }
            } else {
              self.setTempDisableRecalc(false);
              return self.value;
            }
          },
          (value) => {
            if (value !== undefined) {
              self.setValue(value);
            }
          },
          // do this calculation when setting up the reaction
          // so value is populated (default is false but this causes issues
          // when restoring ExpressionStores out of undo history)
          { fireImmediately: true }
        );
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
    get asScope() {
      const node = {
        x: self.x.asScope,
        y: self.y.asScope,
        heading: self.heading.asScope,
        isPose2d: true
      };
      return node;
    },
    get serialize(): DocPoseVariable {
      return {
        x: self.x.serialize,
        y: self.y.serialize,
        heading: self.heading.serialize
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
export type IExprPose = Instance<typeof ExprPose>;
type Pose = { x: number; y: number; heading: number };
export const Variables = types
  .model("Variables", {
    expressions: types.map(ExpressionStore),
    poses: types.map(ExprPose)
  })
  .views((self) => ({
    get serialize(): DocVariables {
      const out: DocVariables = {
        expressions: {},
        poses: {}
      };
      for (const entry of self.expressions.entries()) {
        out.expressions[entry[0]] = {
          dimension: entry[1].dimension,
          var: (entry[1] as IExpressionStore).serialize
        };
      }

      for (const entry of self.poses.entries()) {
        out.poses[entry[0]] = entry[1].serialize;
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
      dimension: DimensionName
    ): IExpressionStore {
      let store: IExpressionStore;
      // add unit if expr is just a solo number
      if (typeof expr === "number") {
        if (dimension === "Number") {
          store = ExpressionStore.create({
            expr: new ConstantNode(expr),
            dimension
          });
        } else {
          store = ExpressionStore.create({
            expr: addUnitToExpression(
              new math.ConstantNode(expr),
              Dimensions[dimension]?.unit.toString()
            ),
            dimension
          });
        }
      } else if (isExpr(expr)) {
        // deserialize Expr
        store = ExpressionStore.create({
          expr: math.parse(expr.exp),
          dimension
        });
        store.deserialize(expr);
      } else {
        // handle string exprs
        store = ExpressionStore.create({
          expr: math.parse(expr),
          dimension
        });
      }
      store.setScopeGetter(() => self.scope);

      return store;
    },
    createPose(pose?: Pose | { x: Expr; y: Expr; heading: Expr }) {
      return ExprPose.create({
        x: this.createExpression(pose?.x ?? 0, "Length"),
        y: this.createExpression(pose?.y ?? 0, "Length"),
        heading: this.createExpression(pose?.heading ?? 0, "Angle")
      });
    }
  }))
  .views((self) => ({
    evaluate(node: MathNode): Evaluated {
      let result = node.evaluate(self.scope) ?? undefined;
      if (result["isNode"]) {
        result = (result as MathNode).evaluate(self.scope);
      }
      return result;
    },
    // criteria according to https://mathjs.org/docs/expressions/syntax.html#constants-and-variables
    validateName(name: string, selfName: string): boolean {
      const notAlreadyExists =
        name === selfName ||
        (!self.poses.has(name) && !self.expressions.has(name));
      return (
        notAlreadyExists &&
        name.length != 0 &&
        math.parse.isAlpha(name[0], "", name[1]) &&
        name
          .split("")
          .every(
            (_c, i, arr) =>
              math.parse.isAlpha(arr[i], arr[i - 1], arr[i + 1]) ||
              math.parse.isDigit(arr[i])
          ) &&
        !["mod", "to", "in", "and", "xor", "or", "not", "end"].includes(name)
      );
    }
  }))
  .actions((self) => ({
    deletePose(key: string) {
      self.poses.delete(key);
    },
    deleteExpression(key: string) {
      self.expressions.delete(key);
    },
    renameExpression(cur: string, next: string) {
      const current = self.expressions.get(cur);
      if (current === undefined) return;
      getEnv<Env>(self).renameVariable(cur, next);
      self.expressions.set(next, detach(current));
    },
    renamePose(cur: string, next: string) {
      const current = self.poses.get(cur);
      if (current === undefined) return;
      getEnv<Env>(self).renameVariable(cur, next);
      self.poses.set(next, detach(current));
    },
    addPose(key: string, pose?: Pose | { x: Expr; y: Expr; heading: Expr }) {
      const store = self.createPose(pose);
      self.poses.set(key, store);
    },
    add(key: string, expr: string | number | Expr, defaultUnit: DimensionName) {
      self.expressions.set(key, self.createExpression(expr, defaultUnit));
    },
    deserialize(vars: DocVariables) {
      for (const entry of Object.entries(vars.expressions)) {
        this.add(entry[0], entry[1].var, entry[1].dimension);
      }

      for (const entry of Object.entries(vars.poses)) {
        this.addPose(entry[0], entry[1]);
      }
    }
  }));
export type IVariables = Instance<typeof Variables>;
