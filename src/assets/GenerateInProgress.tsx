import { Save, ShapeLine } from "@mui/icons-material";
import { Box, CircularProgress, SxProps } from "@mui/material";
import IconInProgress from "./IconInProgress";

function SaveInProgress(props: {sx: SxProps}) {return (
    <IconInProgress icon={<ShapeLine></ShapeLine>} sx={props.sx}></IconInProgress>
    )}
export default SaveInProgress;