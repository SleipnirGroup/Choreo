import { Save } from "@mui/icons-material";
import { Box, CircularProgress, SxProps } from "@mui/material";
import IconInProgress from "./IconInProgress";

function SaveInProgress(props: {sx?: SxProps}) {return (
    <IconInProgress icon={<Save></Save>} sx={props.sx}></IconInProgress>
    )}
export default SaveInProgress;