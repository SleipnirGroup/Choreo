import * as React from "react";
import { SvgIcon as MuiSvgIcon, SvgIconProps, styled } from "@mui/material";
const SvgIcon = styled(MuiSvgIcon, {
  name: "MopeimIcon",
  shouldForwardProp: (prop) => prop !== "fill"
})<SvgIconProps>(() => ({
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: "2.25px"
}));

const Angle: React.FunctionComponent<SvgIconProps> = (props) => {
  const cornerX = 4;
  const cornerY = 18;
  const endX = 20;
  const length = endX - cornerX;
  const angle = Math.PI / 3;
  const r = 10;
  return (
    <SvgIcon
      viewBox="0 0 24 24"
      focusable="false"
      aria-hidden="true"
      pointerEvents="all"
      {...props}
    >
      <line x1={cornerX} y1={cornerY} x2={endX} y2={cornerY}></line>
      <line
        x1={cornerX}
        y1={cornerY}
        x2={cornerX + length * Math.cos(angle)}
        y2={cornerY - length * Math.sin(angle)}
      ></line>
      <path
        d={`M ${cornerX + r} ${cornerY} A ${r} ${r} 0 0 0 ${cornerX + r * Math.cos(angle)} ${cornerY - r * Math.sin(angle)}`}
      ></path>
    </SvgIcon>
  );
};
export default Angle;
