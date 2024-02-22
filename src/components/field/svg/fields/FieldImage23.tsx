import React, { Component } from "react";

type Props = { blue: boolean };

type State = object;

export const WIDTH_M = 8.0137;
export const LENGTH_M = 16.5481;

export default class FieldImage23 extends Component<Props, State> {
  static WIDTH_M = WIDTH_M;
  static LENGTH_M = LENGTH_M;
  state = {};

  render() {
    return (
      <g id="layer1" transform={"scale(1, -1)"}>
        <image
          x={0}
          y={-WIDTH_M}
          width={LENGTH_M}
          height={WIDTH_M}
          xlinkHref="/fields/field23.svg"
        />
      </g>
    );
  }
}
