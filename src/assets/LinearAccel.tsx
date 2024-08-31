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
const Angle: React.FunctionComponent<SvgIconProps> = (props) => {
  let cornerX = 4;
  let cornerY = 18;
  let endX = 20;
  let length = endX-cornerX;
  let angle = Math.PI/3;
  let r = 10;
  return (
    <SvgIcon {...props}>
      <path d="m15 5 -1.41 1.41 L 18.17 11 H 2 v 2 h 16.17 l -4.59 4.59 L 15 19 l 7 -7 z"></path>
    </SvgIcon>
  );
};
export default Angle;