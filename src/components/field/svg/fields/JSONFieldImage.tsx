import { Component } from "react";
import { FtToM, InToM } from "../../../../util/UnitConversions";
import defaultFieldImage from "./FieldImage2026.svg";
import { FIELD_LENGTH, FIELD_WIDTH } from "./FieldDimensions";
import {
  CustomFieldData,
  FieldJSON
} from "../../../../document/schema/DocumentTypes";

type Props = {
  opacity: number;

  customField: CustomFieldData;
};

type State = {
  imageSrc: string;
};

export const WIDTH_M = FIELD_WIDTH;

export const LENGTH_M = FIELD_LENGTH;

function converter(unit: "meter" | "foot" | "inch"): (value: number) => number {
  if (unit === "meter") return (value: number) => value;

  if (unit === "foot") return FtToM;

  return InToM;
}

const defaultFieldJSON: FieldJSON = {
  game: "Rebuilt",
  "field-unit": "meter",
  "field-corners": {
    "bottom-right": [FIELD_LENGTH + 0.5, FIELD_WIDTH + 0.5],
    "top-left": [0.5, 0.5]
  },
  "field-size": [FIELD_LENGTH, FIELD_WIDTH],
  "size-pixels": [FIELD_LENGTH + 1, FIELD_WIDTH + 1],
  "field-image": "FieldImage2026.svg",
  "origin-fraction": [0, 0]
};
export const defaultFieldData: CustomFieldData = {
  fieldJson: defaultFieldJSON as FieldJSON,
  fieldImageBase64: defaultFieldImage,
  fieldJSONRelativePath: undefined
};

export default class CustomFieldImage extends Component<Props, State> {
  render() {
    const customField = this.props.customField;
    console.log("rerendering field with ", customField);
    const fieldJSON = this.props.customField.fieldJson;
    const conversion = converter(
      fieldJSON["field-unit"] as "meter" | "foot" | "inch"
    );
    const [fieldLengthM, fieldWidthM] = fieldJSON["field-size"].map(conversion);
    const [originFractionX, originFractionY] = fieldJSON["origin-fraction"];
    const [leftPx, topPx] = fieldJSON["field-corners"]["top-left"];
    const [rightPx, bottomPx] = fieldJSON["field-corners"]["bottom-right"];
    const fieldLengthPx = rightPx - leftPx;
    const fieldWidthPx = bottomPx - topPx;
    const pxToM = (px: number) => (px * fieldLengthM) / fieldLengthPx;
    console.log(pxToM, fieldWidthM / fieldWidthPx);
    const [leftM, bottomM] = [leftPx, bottomPx].map(pxToM);
    const [fullLengthM, fullWidthM] = [
      fieldJSON["size-pixels"][0],
      fieldJSON["size-pixels"][1]
    ].map(pxToM);
    return (
      <><g
        id="layer1"
        transform={`scale(1, -1), translate(${-fieldLengthM * originFractionX}, ${fieldWidthM * originFractionY})`}
      >
        <image
          x={-leftM}
          y={-bottomM}
          width={fullLengthM}
          height={fullWidthM}
          href={customField.fieldImageBase64}
          style={{ opacity: `${this.props.opacity}%` }}
        />
      </g>
      </>
    );
  }
}
