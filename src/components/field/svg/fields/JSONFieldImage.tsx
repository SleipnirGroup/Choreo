import { Component } from "react";
import { FtToM, InToM } from "../../../../util/UnitConversions";
import defaultFieldImage from "./2026-field.png";
import defaultJSON from "./2026-field.json";
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

const defaultFieldJSON = defaultJSON;
// const defaultFieldJSON: FieldJSON = {
//   game: "Reefscape",
//   "field-unit": "meter",
//   "field-corners": {
//     "bottom-right": [FIELD_LENGTH + 0.5, FIELD_WIDTH + 0.5],
//     "top-left": [0.5, 0.5]
//   },
//   "field-size": [FIELD_LENGTH, FIELD_WIDTH],
//   "size-pixels": [FIELD_LENGTH + 1, FIELD_WIDTH + 1],
//   "field-image": "FieldImage2025.svg",
//   "origin-fraction": [0, 0]
// };
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
    const inch = 0.0254;
    const fuelWidth = 6 * inch;
    const centerBlueHub = -4.208718 + 0.563024;
    const endOfRamp = 2.450338;
    const darkCurrentColor = "hsl(from currentColor h s calc(l*0.8))";
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
          style={{ opacity: `${50}%` }}
        />
      </g>
      <g id="field">
        <defs>
          <circle id="fuel" cx="0" cy="0" r={(fuelWidth - 0.09 * inch) / 2} fill="#B1902F" />
          <pattern id="neutralFuelGrid" x={(FIELD_LENGTH / 2) % fuelWidth} y={(FIELD_WIDTH / 2 + inch) % fuelWidth} width={fuelWidth} height={fuelWidth} patternContentUnits="userSpaceOnUse" patternUnits="userSpaceOnUse">
            <use x={fuelWidth / 2} y={fuelWidth / 2} href="#fuel"></use>
          </pattern>
          <pattern id="depotFuelGrid" x={0} y={(5.431631 + 0.0762) % fuelWidth} width={fuelWidth} height={fuelWidth} patternContentUnits="userSpaceOnUse" patternUnits="userSpaceOnUse">
            <use x={fuelWidth / 2} y={fuelWidth / 2} href="#fuel"></use>
          </pattern>
          <pattern id="chuteFuelGrid" x={0} y={(0.285) % fuelWidth} width={fuelWidth} height={fuelWidth} patternContentUnits="userSpaceOnUse" patternUnits="userSpaceOnUse">
            <use x={fuelWidth / 2} y={fuelWidth / 2} href="#fuel"></use>
          </pattern>
          <g id="blueRampTrench">
            {/* wall between ramp and trench */}
            <rect height={2.7559 - endOfRamp} width={1.193852} x={centerBlueHub - 1.193852 / 2} y={endOfRamp} fill={darkCurrentColor}></rect>
            {/* ramps */}
            <rect x={centerBlueHub - 0.563024} y={endOfRamp - 1.856263} width={0.563024} height={1.856263} fill="currentColor"></rect>

            <rect x={centerBlueHub} y={endOfRamp - 1.856263} width={0.563024} height={1.856263} fill="currentColor"></rect>

            <line x1={centerBlueHub} y1={endOfRamp - 1.856263} x2={centerBlueHub} y2={endOfRamp} stroke="black" strokeWidth={0.01}></line>
            {/* trench arm */}
            <line x1={centerBlueHub} y1={2.7559} x2={centerBlueHub} y2={FIELD_WIDTH / 2} stroke={darkCurrentColor} strokeWidth={0.1524}></line>
          </g>
          <g id="blueSide">
            <rect id="neutralFuel" x={FIELD_LENGTH / 2 - fuelWidth * 6} y={FIELD_WIDTH / 2 + inch} width={fuelWidth * 12} height={fuelWidth * 15} fill="url(#neutralFuelGrid)"></rect>
            {/* start tape */}
            <line x1={3.977926 + inch} x2={3.977926} y1={0} y2={FIELD_WIDTH} stroke="currentColor" strokeWidth={inch * 2}></line>
            <g> {/*depot*/}
              <rect x={0} y={5.431631} width={0.609} height={0.0762} fill="currentColor"></rect>
              <rect x={0} y={6.422231} width={0.609} height={0.0762} fill="currentColor"></rect>
              <rect x={0.609} y={5.431631} width={0.0762} height={1.0668} fill="currentColor"></rect>
              <rect id="neutralFuel" x={0} y={5.431631 + 0.0762} width={fuelWidth * 4} height={fuelWidth * 6} fill="url(#depotFuelGrid)"></rect>
            </g>
            {/*hub*/}
            <g transform={`translate(${FIELD_LENGTH / 2} ${FIELD_WIDTH / 2})`}>
              <use href="#blueRampTrench"></use>
              <g transform="scale(1 -1)"><use href="#blueRampTrench"></use></g>
              <rect x={-4.242150} y={-0.5969} width={4.242150 - 3.047591} height={0.5969 * 2} fill={darkCurrentColor}></rect>
              <polygon points="-3.033074,0 -3.340112,-0.527908 -3.949688,-0.527908 -4.254476,0 -3.949688,0.527908 -3.340112,0.527908" stroke="gray" fill="transparent" strokeWidth={inch}></polygon>
              {/* a target matching the PointAt target point */}
              <circle r={0.2} stroke="gray" strokeWidth={0.02} fill="transparent" cx={centerBlueHub} cy={0}></circle>
              <circle r={0.1} stroke="gray" strokeWidth={0.02} fill="transparent" cx={centerBlueHub} cy={0}></circle>
              {/* tower */}
              <rect x={-8.271493} y={-0.782315 - 0.001910} width={8.271493 - 7.125938} height={0.782315 + 0.001910 + 0.204465 + 0.001910} fill="black"></rect>
              {/* rung */}
              <line x1={-7.208488} y1={-0.885825} x2={-7.208488} y2={0.307975} stroke="currentColor" strokeWidth={0.042164}></line>
              {/* verticals */}
              <rect x={-7.252938} y={0.158750 - 0.038100} height={0.038100} width={0.088900} fill="currentColor"></rect>
              <rect x={-7.252938} y={-0.7366} height={0.038100} width={0.088900} fill="currentColor"></rect>
            </g>
            {/* station */}
            <line x1={0} y1={0.259556} x2={-0.2} y2={0.259556} stroke="white" strokeWidth={inch}></line>
            <line x1={0} y1={1.072356} x2={-0.2} y2={1.072356} stroke="white" strokeWidth={inch}></line>
            <rect x={-fuelWidth} y={0.285} width={fuelWidth} height={fuelWidth*5} fill="url(#chuteFuelGrid)"></rect>
          </g>
        </defs>
        <g id="tape">
          
          <line id="centerline" x1={FIELD_LENGTH / 2} x2={FIELD_LENGTH / 2} y1={0} y2={FIELD_WIDTH} stroke="white" strokeWidth={inch * 2}></line>
          <line id="midline" x1={0} x2={FIELD_LENGTH} y1={FIELD_WIDTH / 2} y2={FIELD_WIDTH / 2} stroke="black" strokeWidth={inch * 4}></line>
        </g>
        <use x={0} y={0} width={FIELD_LENGTH} height={FIELD_WIDTH} href="#blueSide" color="#1c1c99ff"></use>
        <g id="redSide" transform={`translate(${FIELD_LENGTH} ${FIELD_WIDTH}) rotate(180)`}>
          <use x={0} y={0} width={FIELD_LENGTH} height={FIELD_WIDTH} href="#blueSide" color="#9e2323ff"></use>
        </g>
        <rect id="wall" x={-inch} y={-inch} width={FIELD_LENGTH + inch * 2} height={FIELD_WIDTH + inch * 2} stroke="white" strokeWidth={inch * 2} fill="transparent"></rect>
        </g> */}
      </>
    );
  }
}
