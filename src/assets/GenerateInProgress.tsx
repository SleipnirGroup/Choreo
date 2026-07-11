import { ShapeLine } from "@mui/icons-material";
import IconInProgress from "./IconInProgress.tsx";

function GenerateInProgress(props: any) {
  return (
    <IconInProgress {...props} icon={<ShapeLine></ShapeLine>}></IconInProgress>
  );
}
export default GenerateInProgress;
