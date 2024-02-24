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

SvgIcon.defaultProps = {
  viewBox: "0 0 24 24",
  focusable: "false",
  "aria-hidden": "true"
};
const Waypoint: React.FunctionComponent<SvgIconProps> = (props) => {
  return (
    <SvgIcon {...props}>
      <circle cx={12} cy={12} r={2} fill="currentColor"></circle>
      <circle cx={20} cy={12} r={2} fill="currentColor"></circle>
      <rect x={4} y={4} width={16} height={16}></rect>
    </SvgIcon>
  );
};
export default Waypoint;
