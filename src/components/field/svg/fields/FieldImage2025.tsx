import { Component } from "react";

import * as FieldDimensions from "./FieldDimensions";
type Props = object;

type State = object;

export default class FieldImage2024 extends Component<Props, State> {
  WIDTH_M = FieldDimensions.FIELD_WIDTH;
  LENGTH_M = FieldDimensions.FIELD_LENGTH;
  state = {};

  render() {
    return (
      <g id="layer1" transform={"scale(1, -1)"}>
        <g
          id="img"
          transform={`scale(${0.0254})`}
          opacity={"100%"}
        >
        {/* Units of inches */}
        <rect x={0} y={0} width={12} height={12} fill="white"></rect>
        </g>
      </g>
    );
  }
}
