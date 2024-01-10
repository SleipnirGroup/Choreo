import { Component } from "react";
import { FtToM, InToM } from "../../../../util/UnitConversions";
import defaultFieldJSON from "../../../../../public/fields/2024-field.json";

type Props = {
  opacity: number;
  imageWidthPx: number;
  imageHeightPx: number;
  fieldJSON?: FieldJSON;
};

type State = {};
export const WIDTH_M = 8.21055;
export const LENGTH_M = 16.54175;

export type FieldJSON = {
  game: string;
  "field-image": string;
  "image-size": [number, number];
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
    let fieldJSON = this.props.fieldJSON || defaultFieldJSON;
    let conversion = converter(
      fieldJSON["field-unit"] as "meter" | "foot" | "inch"
    );
    let [fieldLengthM, fieldWidthM] = fieldJSON["field-size"].map(conversion);
    let [leftPx, topPx] = fieldJSON["field-corners"]["top-left"];
    let [rightPx, bottomPx] = fieldJSON["field-corners"]["bottom-right"];
    let fieldLengthPx = rightPx - leftPx;
    let fieldWidthPx = bottomPx - topPx;
    let mToPx = (px: number) => (px * fieldLengthM) / fieldLengthPx;
    console.log(mToPx, fieldWidthM / fieldWidthPx);
    let [leftM, bottomM] = [leftPx, bottomPx].map(mToPx);
    let [fullLengthM, fullWidthM] = [
      this.props.imageWidthPx,
      this.props.imageHeightPx,
    ].map(mToPx);

    return (
      <g id="layer1" transform={`scale(1, -1)`}>
        <image
          x={-leftM}
          y={-bottomM}
          width={fullLengthM ?? LENGTH_M}
          height={fullWidthM ?? WIDTH_M}
          xlinkHref={`/fields/${fieldJSON["field-image"]}`}
          style={{ opacity: `${this.props.opacity}%` }}
        />
      </g>
    );
  }
}
