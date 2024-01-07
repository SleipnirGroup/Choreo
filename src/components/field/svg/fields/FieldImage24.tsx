import { Component } from "react";

type Props = { blue: boolean };

type State = {};

export const WIDTH_M = 8.21055;
export const LENGTH_M = 16.54175;

export default class FieldImage23 extends Component<Props, State> {
  static WIDTH_M = WIDTH_M;
  static LENGTH_M = LENGTH_M;
  state = {};

  render() {
    return (
      <g id="layer1" transform={`scale(1, -1)`}>
        <image
          x={0}
          y={-WIDTH_M}
          width={LENGTH_M}
          height={WIDTH_M}
          xlinkHref="/fields/2024_Field.svg"
        />
      </g>
    );
  }
}
