import { MathNode } from "mathjs";
import { Instance, types } from "mobx-state-tree";
import * as math from "mathjs";

export const ExpressionStore = types.model( "ExpressionStore",
    {
        expr: types.frozen<MathNode>(),
        defaultUnit: types.frozen<string>()
    }
)
.actions((self)=>({
    setNode(newNode:MathNode) {
        console.log("setting ", newNode.toString());
        self.expr = newNode;
    }
}))
.views((self)=>({
    validate(newNode: MathNode){
        try {
          console.log("new node: " + newNode.toString());
          console.log("val: " + newNode.evaluate());
        } catch {
          console.error("failed to evaluate");
          return undefined;
        }
        let newNumber: undefined | null | number | math.Unit;
        try {
          newNumber = newNode.evaluate();
        } catch {
            console.error("failed to evaluate");
          return undefined;
        }
        if (newNumber === undefined || newNumber === null) {
            console.error("evaluated to undefined or null");
          return undefined;
        }
        if (typeof newNumber === "number") {
          if (!isFinite(newNumber)) {
            console.error("number was infinite");
            return undefined;
          }
          console.log("node type: " + math.typeOf(newNode));

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

          return addUnitToExpression(newNode, self.defaultUnit);
        } else {
          if (!isFinite(newNumber.value)) {
            console.error("failed to evaluate");
            return undefined;
          }
          let unit = math.unit(self.defaultUnit);
          if (!newNumber.equalBase(unit)) {
            console.error("unit mismatch", unit);
            return undefined;
          }
        }
        return newNode;
    }
}));
export interface IExpressionStore
  extends Instance<typeof ExpressionStore> {}