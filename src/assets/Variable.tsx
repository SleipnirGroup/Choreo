// From public-domain https://commons.wikimedia.org/wiki/File:Greek_lc_chi.svg
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

const Variable: React.FunctionComponent<SvgIconProps> = (props) => {
  return (
    <SvgIcon
      viewBox="50 100 300 300"
      focusable="false"
      aria-hidden="true"
      {...props}
    >
      <path
        xmlns="http://www.w3.org/2000/svg"
        d="m240.95 120.88h32.425l-67.444 132.66 12.229 51.695q6.1147 25.755 14.082 32.61 8.1528 6.8556 19.64 6.8556 27.052 0 28.905-31.498h6.8557q-0.35265 27.607-10.747 43.357-10.376 15.935-27.978 15.935-15.378 0-24.458-9.8202-9.0787-9.82-16.119-38.91l-12.229-51.509-49.471 99.498h-32.425l71.705-142.48-10.376-43.727q-5.7425-23.902-11.488-32.24-5.7425-8.5231-17.972-8.5231-21.678 0-26.866 32.981h-6.8556q0-25.94 8.8936-42.616 9.0787-16.861 26.866-16.861 15.379 0 22.976 11.302 7.7816 11.302 14.823 40.948l9.6348 40.022z"
      />
    </SvgIcon>
  );
};
export default Variable;
