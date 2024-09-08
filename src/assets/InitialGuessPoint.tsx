import * as React from "react";
import { SvgIcon as MuiSvgIcon, SvgIconProps, styled } from "@mui/material";
const SvgIcon = styled(MuiSvgIcon, {
  name: "InitialGuessPoint",
  shouldForwardProp: (prop) => prop !== "fill"
})<SvgIconProps>(() => ({
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: "2.25px"
}));

const Waypoint: React.FunctionComponent<SvgIconProps> = (props) => {
  return (
    <SvgIcon
      viewBox="0 0 24 24"
      focusable="false"
      aria-hidden="true"
      {...props}
    >
      <circle
        cx={12}
        cy={12}
        r={8}
        stroke="currentColor"
        strokeDasharray={8}
      ></circle>
    </SvgIcon>
  );
};
export default Waypoint;
