import { Component } from "react";
import { FtToM, InToM } from "../../../../util/UnitConversions";
import defaultFieldJSON from "./Field2024.json";

type Props = {
  opacity: number;
  imageWidthPx: number;
  imageHeightPx: number;
  fieldJSON?: FieldJSON;
};

type State = object;

export const WIDTH_M = 8.21055;
export const LENGTH_M = 16.54175;

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
    const mToPx = (px: number) => (px * fieldLengthM) / fieldLengthPx;
    console.log(mToPx, fieldWidthM / fieldWidthPx);
    const [leftM, bottomM] = [leftPx, bottomPx].map(mToPx);
    const [fullLengthM, fullWidthM] = [
      this.props.imageWidthPx,
      this.props.imageHeightPx
    ].map(mToPx);

    return (
      <g id="layer1" transform={"scale(1, -1)"}>
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
