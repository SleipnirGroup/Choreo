import * as React from "react";
import { SvgIcon as MuiSvgIcon, SvgIconProps, styled } from "@mui/material";
const SvgIcon = styled(MuiSvgIcon, {
  name: "KeepInLaneIcon",
  shouldForwardProp: (prop) => prop !== "fill"
})<SvgIconProps>(() => ({
  fill: "currentColor",
  stroke: "none"
}));

const KeepInLane: React.FunctionComponent<SvgIconProps> = (props) => {
  return (
    <SvgIcon
      viewBox="0 -960 960 960"
      focusable="false"
      aria-hidden="true"
      {...props}
    >
      <path d="M160-160v-640h80v640h-80Zm280 0v-160h80v160h-80Zm280 0v-640h80v640h-80ZM440-400v-160h80v160h-80Zm0-240v-160h80v160h-80Z" />
    </SvgIcon>
  );
};
export default KeepInLane;
