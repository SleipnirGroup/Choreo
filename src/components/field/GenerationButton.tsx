import { Box, CircularProgress, IconButton, Tooltip } from "@mui/material";
import { doc, generateWithToastsAndExport } from "../../document/DocumentManager";
import { Commands } from "../../document/tauriCommands";
import { Close } from "@mui/icons-material";
import ShapeLineIcon from "@mui/icons-material/ShapeLine";
import { observer } from "mobx-react";
function GenerationButton() {
    const activePath = doc.pathlist.activePath;
    return  <Tooltip
          disableInteractive
          placement="top-start"
          title={
            activePath.ui.generating
              ? "Cancel Generation"
              : activePath.canGenerate()
                ? "Generate Path"
                : "Generate Path (needs 2 waypoints)"
          }
        >
          <Box
            sx={{
              position: "absolute",
              bottom: 16,
              right: 16,
              width: 48,
              height: 48
            }}
          >
            {/* cancel button */}
            <IconButton
              aria-label="add"
              size="large"
              style={{ pointerEvents: "all" }}
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "100%",
                height: "100%",
                transformOrigin: "100% 100%",
                transform: "scale(1.3)",
                borderRadius: "50%",
                boxShadow: "3px",
                marginInline: 0,
                zIndex: activePath.ui.generating ? 10 : -1,
                backgroundColor: "red",
                "&:hover": {
                  backgroundColor: "darkred"
                }
              }}
              onClick={(_event) => {
                Commands.cancel(activePath.handle);
              }}
              disabled={activePath.canGenerate()}
            >
              <Close> </Close>
            </IconButton>
            <IconButton
              color="primary"
              aria-label="add"
              size="large"
              style={{ pointerEvents: "all" }}
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: "100%",
                height: "100%",
                transformOrigin: "100% 100%",
                transform: "scale(1.3)",
                borderRadius: "50%",
                boxShadow: "3px",
                marginInline: 0,
                visibility: activePath.canGenerate() ? "visible" : "hidden"
              }}
              onClick={() => generateWithToastsAndExport(activePath.uuid)}
              disabled={!activePath.canGenerate()}
            >
              <ShapeLineIcon></ShapeLineIcon>
            </IconButton>
                    {activePath.ui.generating && (
          <CircularProgress
            size={48 * 1.3}
            sx={{
              color: "var(--select-yellow)",
              position: "absolute",
              bottom: 16,
              right: 16
            }}
          />
        )}
          </Box></Tooltip>;
}
export default observer(GenerationButton);