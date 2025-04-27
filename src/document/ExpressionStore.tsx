import React from "react";
import {
  KeyboardArrowRight,
  KeyboardDoubleArrowRight,
  Numbers,
  RotateLeftOutlined,
  Straighten,
  SyncOutlined,
  TimerOutlined
} from "@mui/icons-material";
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
  icon: () => React.JSX.Element;
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
    icon: () => <Waypoint></Waypoint>
  }
} as const satisfies {
  [key in DimensionNameExt]: Dimension<key>;
};

export type Evaluated = MathType | null | undefined;
type Evaluator = (arg: MathNode) => Evaluated;
export const ExpressionStore = types
  .model("ExpressionStore", {
    expr: types.frozen<MathNode>(),
    dimension: types.frozen<DimensionName>(),
    uuid: types.identifier
  })
  .volatile((self) => ({
    tempDisableRecalc: false,
    value: 0,
    // To avoid circular initialization, we set the correct scope getter in afterCreate
    getScope: () => {
      tracing.error(
        "ExpressionStore did not set its scope getter!",
        self.toString()
      );
      return new Map<string, any>();
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
    evaluator(node: MathNode): MathType | undefined {
      try {
        // TODO investigate whether this should be untracked
        const scope: Map<string, any> =
          self.getScope() ??
          ((() => {
            tracing.error("Evaluating without variables!");
            return undefined;
          }) as Evaluator);
        // Depend on the keys list of the scope, to re-evaluate when the variables list changes
        scope.keys();
        // turn symbol variables into function variables if they're found in scope
        const transformed = node.transform((innerNode, path, parent) => {
          // Match standalone symbols, turn them into FunctionNode(symbol)
          if (
            isSymbolNode(innerNode) && // Match symbols (string literals in the expression),
            //that are names of functions in our scope (just the standalone variables)
            typeof scope.get(innerNode.name) === "function" &&
            // The below avoids transforming `variable()` to `variable()()`
            !(
              // ...and ignoring those symbol nodes
              (
                parent !== null && // with a non-null parent
                isFunctionNode(parent) && // that is a function node
                path == "fn"
              ) // where the symbol is already the name of the function
            )
          ) {
            return new math.FunctionNode(innerNode, []);
          }

          // Replace [pose].x (and .y, .heading) with [pose].x(), etc
          // This works for other objects in scope with children that are functions

          /*
          Replace [pose].x (and .y, .heading) with [pose].x(), etc
          This works for other objects in scope with children that are functions
          "[objectName].[childName]" parses to
           AccessorNode {
            object: SymbolNode {
              name: objectName
            },
            index: IndexNode {
              dimensions : [
                ConstantNode {
                  value: childName
                }
              ]
            }
          }

            "[objectName].[childName]()" parses to
            FunctionNode {
              args: []
              fn: ...the parse of [objectName].[childName] above
            }
            So if we match [objectName].[childName], but it's already within a function node, don't transform it
          */

          if (isAccessorNode(innerNode)) {
            // filter out accessors within function nodes.
            if (!(parent !== null && isFunctionNode(parent) && path == "fn")) {
              const accessorNode = innerNode;
              const { object, index } = accessorNode;
              if (isSymbolNode(object) && index.isIndexNode) {
                const symbol = object as SymbolNode;
                const idx = index as IndexNode;
                if (
                  idx.dimensions[0] !== undefined &&
                  isConstantNode(idx.dimensions[0])
                ) {
                  const constant = idx.dimensions[0];
                  // We now know that innerNode was [symbol.name].[constant.value]
                  if (
                    typeof scope.get(symbol.name) === "object" &&
                    typeof scope.get(symbol.name)?.[constant.value] ===
                      "function"
                  ) {
                    // if the symbols are in fact things in our scope, replace `innerNode` with `innerNode()`
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
      } catch {
        return undefined;
      }
    },
    get serialize(): Expr {
      return {
        exp: self.expr.toString(),
        val: self.value
      };
    }
  }))
  .views((self) => ({
    get evaluate(): MathType | undefined {
      const result = self.evaluator(self.expr);
      return result;
    }
  }))
  .views((self) => ({
    get asScope(): () => MathType | undefined {
      return () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        self.value;
        try {
          const expr = untracked(() => {
            return self.evaluate;
          });
          return expr;
        } catch {
          return undefined;
        }
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
      // number | BigNumber | bigint | Fraction | Complex | Unit
      let newNumber: MathType | undefined | null;
      try {
        newNumber = self.evaluator(newNode);
      } catch (e) {
        // Syntax errors, primarily
        tracing.error("failed to evaluate", e, newNode);
        return undefined;
      }
      if (newNumber === undefined || newNumber === null) {
        tracing.error("evaluated to undefined or null");
        return undefined;
      }
      // numbers are only valid on dimensionless expressions.
      if (typeof newNumber === "number") {
        if (self.defaultUnit !== undefined) {
          tracing.error("failed to evaluate: ", newNumber, "was dimensionless");
          return undefined;
        }
        if (!isFinite(newNumber)) {
          tracing.error("failed to evaluate: ", newNumber, "is infinite");
          return undefined;
        }
        // number is finite and on a dimensionless expression.
        return newNode;
      }
      // Anything past this (BigNumber | bigint | Fraction | Complex) isn't supported
      if (!isUnit(newNumber)) {
        tracing.error("not unit:", newNumber);
        return undefined;
      }
      // newNumber is Unit
      // Checking dimension matching
      const unit = self.defaultUnit;
      const numberIsDimensionless = newNumber.dimensions.every((d) => d == 0);
      if (unit !== undefined) {
        if (numberIsDimensionless) {
          // unit that's just a number (usually from units cancelling)

          tracing.error("failed to evaluate: ", newNumber, "was dimensionless");
          return undefined;
        } else {
          if (!newNumber.equalBase(unit)) {
            tracing.error("unit mismatch", unit);
            return undefined;
          }
        }
      } else if (unit === undefined && !numberIsDimensionless) {
        tracing.error(
          "failed to evaluate: ",
          newNumber,
          "is unit on dimensionless expr"
        );
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
        self.setScopeGetter(() => variables.scope);
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
    },
    get sortedExpressions(): Array<[string, IExpressionStore]> {
      return Array.from(self.expressions.entries()).sort((a, b) =>
        a[0].toLocaleUpperCase() > b[0].toLocaleUpperCase() ? 1 : -1
      );
    },
    get sortedExpressionKeys(): Array<string> {
      return this.sortedExpressions.map(([key, _]) => key);
    },
    get sortedPoses(): Array<[string, IExprPose]> {
      return Array.from(self.poses.entries()).sort((a, b) =>
        a[0].toLocaleUpperCase() > b[0].toLocaleUpperCase() ? 1 : -1
      );
    },
    get sortedPoseKeys(): Array<string> {
      return this.sortedPoses.map(([key, _]) => key);
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
            dimension,
            uuid: crypto.randomUUID()
          });
        } else {
          store = ExpressionStore.create({
            expr: addUnitToExpression(
              new math.ConstantNode(expr),
              Dimensions[dimension]?.unit.toString()
            ),
            dimension,
            uuid: crypto.randomUUID()
          });
        }
      } else if (isExpr(expr)) {
        // deserialize Expr
        store = ExpressionStore.create({
          expr: math.parse(expr.exp),
          dimension,
          uuid: crypto.randomUUID()
        });
        store.deserialize(expr);
      } else {
        // handle string exprs
        store = ExpressionStore.create({
          expr: math.parse(expr),
          dimension,
          uuid: crypto.randomUUID()
        });
      }

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
      self.expressions.clear();
      self.poses.clear();
      for (const entry of Object.entries(vars.expressions)) {
        this.add(entry[0], entry[1].var, entry[1].dimension);
      }

      for (const entry of Object.entries(vars.poses)) {
        this.addPose(entry[0], entry[1]);
      }
    }
  }));
export type IVariables = Instance<typeof Variables>;

// A global store of variables for all ExpressionStores to share.
// Defined here to avoid circular imports, but is attached under the DocumentModel tree.
export const variables = Variables.create({ expressions: {}, poses: {} });
