import { observer } from "mobx-react";
import { IExpressionVariable } from "../../../document/ExpressionStore";
import { doc } from "../../../document/DocumentManager";
import styles from "./newvariables.module.css";
import VariableRenamingInput from "../variables/VariableRenamingInput";
import ExpressionInput from "../../input/ExpressionInput";
import { useRef } from "react";

type VariableLineProps = {
  variable: IExpressionVariable;
};
const VariableLine = observer((props: VariableLineProps) => (
  <span>
    <span>{`${props.variable.expr.dimension} `}</span>
    <VariableRenamingInput
      name={props.variable.name}
      setName={props.variable.setName}
      validateName={(name) => undefined}
      autoWidth={true}
    ></VariableRenamingInput>{" = "}
    <ExpressionInput
              key={`${props.variable.name}-expr-text`}
              enabled
              title={() => (
                <span></span>
              )}
              number={props.variable.expr}
              autoWidth

            ></ExpressionInput>
  </span>
));

export default observer(() => {
  doc.variables.expressions.keys();
  const handleRef = useRef(null);
  return (
                    <div
                  style={{
                    height:"100%",
                    overflowY: "scroll",

                    background: "var(--background-light-gray)",
                    color: "white",
                    width: "100%",
                    padding: "8px",

                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                    <span ref={handleRef}>------</span>
    <div className={styles.Page}>
      {doc.variables.sortedExpressions.map(([name, v]) => (
        <>
          <VariableLine variable={v}></VariableLine>
          <br></br>
        </>
      ))}
    </div>
    </div>
  );
});
