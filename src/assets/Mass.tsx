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

const Mass: React.FunctionComponent<SvgIconProps> = (props) => {
  return (
    <SvgIcon
      viewBox="0 0 1024 1024"
      focusable="false"
      aria-hidden="true"
      {...props}
    >
      <path
        xmlns="http://www.w3.org/2000/svg"
        stroke="none"
        d="M512 128C606.293333 128 682.666667 204.373333 682.666667 298.666667 682.666667 329.813333 674.56 358.826667 659.626667 384L768 384C808.533333 384 842.666667 412.586667 851.2 450.56 936.96 792.32 938.666667 801.28 938.666667 810.666667 938.666667 857.6 900.266667 896 853.333333 896L170.666667 896C123.733333 896 85.333333 857.6 85.333333 810.666667 85.333333 801.28 87.04 792.32 172.8 450.56 181.333333 412.586667 215.466667 384 256 384L364.373333 384C349.44 358.826667 341.333333 329.813333 341.333333 298.666667 341.333333 204.373333 417.706667 128 512 128M512 213.333333C465.066667 213.333333 426.666667 251.733333 426.666667 298.666667 426.666667 345.6 465.066667 384 512 384 558.933333 384 597.333333 345.6 597.333333 298.666667 597.333333 251.733333 558.933333 213.333333 512 213.333333Z"
      />
    </SvgIcon>
  );
};
export default Mass;
