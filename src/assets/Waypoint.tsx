import * as React from "react";
import { SvgIcon as MuiSvgIcon, SvgIconProps, styled } from "@mui/material";
const SvgIcon = styled(MuiSvgIcon, {
  name: "MopeimIcon",
  shouldForwardProp: (prop) => prop !== "fill",
})<SvgIconProps>(() => ({
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: "2.25px",
}));

SvgIcon.defaultProps = {
  viewBox: "0 0 24 24",
  focusable: "false",
  "aria-hidden": "true",
};
const Waypoint: React.FunctionComponent<SvgIconProps> = (props) => {
  return (
    <SvgIcon {...props}>
      <circle cx={12} cy={12} r={2} fill="currentColor"></circle>
      <circle cx={12} cy={4} r={2} fill="currentColor"></circle>
      <rect x={4} y={4} width={16} height={16}></rect>
      {/* <path d="M15,19.16V15.07a4.27,4.27,0,0,0,6,0h0a4.27,4.27,0,0,0,0-6h0a4.27,4.27,0,0,0-6,0l-3,3-3,3a4.27,4.27,0,0,1-6,0h0a4.27,4.27,0,0,1,0-6h0A4.27,4.27,0,0,1,9,9" /> */}
    </SvgIcon>
  );
};
export default Waypoint;
