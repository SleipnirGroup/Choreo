import { Component } from "react";
import Field23 from "./Field2023.svg?react";

type Props = { blue: boolean };

type State = {};

export const WIDTH_M = 8.0137;
export const LENGTH_M = 16.5481;

export default class FieldImage23 extends Component<Props, State> {
  static WIDTH_M = WIDTH_M;
  static LENGTH_M = LENGTH_M;
  state = {};

  render() {
    return (
      <g id="layer1" transform={`scale(1, -1)`}>
        <Field23 x={0} y={-WIDTH_M} width={LENGTH_M} height={WIDTH_M} />
      </g>
    );
  }
}
