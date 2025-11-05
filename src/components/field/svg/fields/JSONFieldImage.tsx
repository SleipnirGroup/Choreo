import { Component } from "react";

import { FtToM, InToM } from "../../../../util/UnitConversions";

import defaultFieldJSON from "./OregonBunnybotsField2025.json";

import { FIELD_LENGTH, FIELD_WIDTH } from "./FieldDimensions";

type Props = {
  opacity: number;

  imageWidthPx: number;

  imageHeightPx: number;

  fieldJSON?: FieldJSON;
};

type State = object;

export const WIDTH_M = FIELD_WIDTH;

export const LENGTH_M = FIELD_LENGTH;

export type FieldJSON = {
  game: string;

  "field-image": string;

  "field-corners": {
    "top-left": [number, number];

    "bottom-right": [number, number];
  };

  "field-size": [number, number];

  "field-unit": "meter" | "foot" | "inch";
};

function converter(unit: "meter" | "foot" | "inch"): (value: number) => number {
  if (unit === "meter") return (value: number) => value;

  if (unit === "foot") return FtToM;

  return InToM;
}

export default class CustomFieldImage extends Component<Props, State> {
  state = {};

  render() {
    const fieldJSON = this.props.fieldJSON || defaultFieldJSON;
    const conversion = converter(
      fieldJSON["field-unit"] as "meter" | "foot" | "inch"
    );
    const [fieldLengthM, fieldWidthM] = fieldJSON["field-size"].map(conversion);
    const [leftPx, topPx] = fieldJSON["field-corners"]["top-left"];
    const [rightPx, bottomPx] = fieldJSON["field-corners"]["bottom-right"];
    const fieldLengthPx = rightPx - leftPx;
    const fieldWidthPx = bottomPx - topPx;
    const pxToM = (px: number) => (px * fieldLengthM) / fieldLengthPx;
    console.log(pxToM, fieldWidthM / fieldWidthPx);
    const [leftM, bottomM] = [leftPx, bottomPx].map(pxToM);
    const [fullLengthM, fullWidthM] = [
      this.props.imageWidthPx,

      this.props.imageHeightPx
    ].map(pxToM);

    return (
      <g id="layer1" transform={"scale(1, -1)"}>
        <image
          x={-leftM}
          y={-bottomM}
          width={fullLengthM}
          height={fullWidthM}
          xlinkHref={`/src/components/field/svg/fields/${fieldJSON["field-image"]}`}
          style={{ opacity: `${this.props.opacity}%` }}
        />
      </g>
    );
  }
}
