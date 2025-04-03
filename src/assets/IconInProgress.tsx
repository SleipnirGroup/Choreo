import { Save, ShapeLine } from "@mui/icons-material";
import { Box, CircularProgress, SxProps } from "@mui/material";
import React, { JSXElementConstructor, ReactElement } from "react";

function IconInProgress(props: {icon: ReactElement<any, string | JSXElementConstructor<any>>, sx?: SxProps}) {return (
    <Box sx={{ position: 'relative', display: 'inline-flex', height: "24px", width: "24px", ...props.sx}}>
    <CircularProgress size="91.666%" sx={{margin: "4.1666%", color:"inherit"}}/>
    <Box
      sx={{
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        position: 'absolute',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: "83.333%"
      }}
    >
        {React.cloneElement(props.icon, {
          
          htmlColor: "inherit",
          fontSize: "inherit"
        })}
    </Box>
  </Box>
    )}
export default IconInProgress;