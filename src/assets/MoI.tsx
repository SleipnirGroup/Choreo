import * as React from "react";
import { SvgIcon as MuiSvgIcon, SvgIconProps, styled } from "@mui/material";
const SvgIcon = styled(MuiSvgIcon, {
  name: "MopeimIcon",
  shouldForwardProp: (prop) => prop !== "fill"
})<SvgIconProps>(() => ({
  fill: "currentColor",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: "2.25px"
}));

const MoI: React.FunctionComponent<SvgIconProps> = (props) => {
  return (
    <SvgIcon
      viewBox="0 0 24 24"
      focusable="false"
      aria-hidden="true"
      {...props}
    >
      {/* the rotational velocity icon */}
      <line x1={12} y1={4} x2={12} y2={20} strokeWidth={3}></line>
      <path
        d="M 4 12 A 8 3 0 0 0 20 12 v 1 A 8 3 0 0 0 4 13 z "
        strokeWidth={3}
        fill="none"
      ></path>
      {/* <path xmlns="http://www.w3.org/2000/svg" strokeWidth="1px" d="M12 7C6.48 7 2 9.24 2 12c0 2.24 2.94 4.13 7 4.77V20l4-4-4-4v2.73c-3.15-.56-5-1.9-5-2.73 0-1.06 3.04-3 8-3s8 1.94 8 3c0 .73-1.46 1.89-4 2.53v2.05c3.53-.77 6-2.53 6-4.58 0-2.76-4.48-5-10-5"></path> */}
    </SvgIcon>
  );
};
export default MoI;
