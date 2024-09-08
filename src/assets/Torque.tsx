import * as React from "react";
import { SvgIcon as MuiSvgIcon, SvgIconProps, styled } from "@mui/material";
const SvgIcon = styled(MuiSvgIcon, {
  name: "MopeimIcon",
  shouldForwardProp: (prop) => prop !== "fill"
})<SvgIconProps>(() => ({
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "square",
  strokeLinejoin: "round",
  strokeWidth: "2.25px"
}));

const Torque: React.FunctionComponent<SvgIconProps> = (props) => {
  const cornerX = 4;
  const cornerY = 18;
  const endX = 20;
  const angle = Math.PI / 2;
  const r = 8;
  return (
    <SvgIcon
      viewBox="0 0 24 24"
      focusable="false"
      aria-hidden="true"
      {...props}
    >
      <line x1={cornerX} y1={cornerY} x2={endX} y2={cornerY}></line>
      <circle cx={cornerX} cy={cornerY} r={2}></circle>
      {/* up arrow */}
      <line
        x1={endX - 3}
        y1={cornerY - 4}
        x2={endX - 3}
        y2={cornerY - 12}
      ></line>
      {/* left arrow part */}
      <line
        x1={endX - 6}
        y1={cornerY - 9}
        x2={endX - 3}
        y2={cornerY - 12}
      ></line>
      {/* right arrow part */}
      <line x1={endX} y1={cornerY - 9} x2={endX - 3} y2={cornerY - 12}></line>
      <path
        d={`M ${cornerX + r} ${cornerY} A ${r} ${r} 0 0 0 ${cornerX + r * Math.cos(angle)} ${cornerY - r * Math.sin(angle)}`}
      ></path>

      {/* <circle cx={12} cy={12} r={2} fill="currentColor"></circle>
      <circle cx={20} cy={12} r={2} fill="currentColor"></circle>
      <rect x={4} y={4} width={16} height={16}></rect> */}
    </SvgIcon>
  );
};
export default Torque;
