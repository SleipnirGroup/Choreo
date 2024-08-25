import { observer } from "mobx-react";

const DRAW_BOUND = 100;
const GRID_STROKE = 0.01;

function FieldGrid() {
  return (
    <>
      <line
        x1={0}
        y1={-DRAW_BOUND}
        x2={0}
        y2={DRAW_BOUND}
        stroke="darkgreen"
        strokeWidth={5 * GRID_STROKE}
        style={{ pointerEvents: "none" }}
      ></line>
      <line
        y1={0}
        x1={-DRAW_BOUND}
        y2={0}
        x2={DRAW_BOUND}
        stroke="darkred"
        strokeWidth={5 * GRID_STROKE}
        style={{ pointerEvents: "none" }}
      ></line>
    </>
  );
}
export default observer(FieldGrid);
