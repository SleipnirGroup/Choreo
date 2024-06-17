import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer/TableContainer";
import TableRow from "@mui/material/TableRow/TableRow";
import { type } from "@tauri-apps/api/os";
import { Component } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

type Props = object;

type State = object;

let isMac = false;
// We don't want to block during the imports stage, especially
// if type() somehow fails.
type().then((type) => {
  isMac = type == "Darwin";
});
// These default to the Mac ⌘ key because it's easier to replace with Ctrl than vice versa
// All descriptions should be like "Rotate" or "Select", not "Selects"
const shortcuts = {
  Path: {
    "G, ⌘ + G": "Generate current path",
    Space: "Start/stop path playback",
    Escape: "Clear sidebar and navbar selection"
  },
  "Field View": {
    "Left Mouse Drag": "Pan around the field",
    "Scroll Wheel, Trackpad Scroll": "Zoom in or out of the field",
    "⌘ + Plus": "Zoom in",
    "⌘ + Minus": "Zoom out",
    "⌘ + 0": "Fit zoom to waypoints"
  },
  File: {
    "⌘ + N": "New File",
    "⌘ + O": "Open File",
    "⌘ + Z": "Undo",
    "⌘ + Shift + Z, ⌘ + Y": "Redo"
  },
  Waypoints: {
    "1 through 4": "Select waypoint type in navbar",
    "Shift + 1 through Shift + 4": "Change type of selected waypoint",
    "Left Mouse Click":
      "Add waypoint type selected in navbar at click position",
    "Left Arrow, X": "Select previous waypoint in path",
    "Right Arrow, Z": "Select next waypoint in path",
    "Delete/Backspace": "Delete selected waypoint"
  },
  "Selected Waypoint Movement": {
    "Left Mouse Drag on Center": "Move Waypoint",
    "Left Mouse Drag on Edge": "Rotate Waypoint",
    Q: "Rotate 1/32 turn counterclockwise",
    E: "Rotate 1/32 turn clockwise",
    "Shift + Rotation Key": "Rotate by 1/8 turn instead of 1/32 turn",
    W: "Translate 0.1 m up (+Y)",
    A: "Translate 0.1 m left (-X)",
    S: "Translate 0.1 m down (-Y)",
    D: "Translate 0.1 m right (+X)",
    "Shift + Translation Key": "Translate by 0.5 m instead of 0.1 m"
  }
};

class KeyboardShortcutsPanel extends Component<Props, State> {
  rowGap = 16;
  render() {
    return (
      <div
        style={{
          fontSize: "2rem",
          marginTop: `${1 * this.rowGap}px`,
          marginBottom: `${1 * this.rowGap}px`,
          marginLeft: "8px",

          width: "max-content"
        }}
      >
        {Object.entries(shortcuts).map((entry) => (
          <>
            <Accordion disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                {entry[0].toUpperCase()}
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer
                  component={Paper}
                  sx={{ backgroundColor: "var(--background-light-gray)" }}
                >
                  <Table size="small" aria-label="simple table">
                    <TableBody>
                      {Object.entries(entry[1]).map((entry) => (
                        <TableRow
                          key={entry[0]}
                          sx={{
                            "&:last-child td, &:last-child th": { border: 0 }
                          }}
                        >
                          <TableCell>{entry[1]}</TableCell>
                          <TableCell component="th" scope="row" align="right">
                            {isMac
                              ? entry[0]
                              : entry[0].replaceAll("⌘", "Ctrl")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          </>
        ))}
      </div>
    );
  }
}
export default KeyboardShortcutsPanel;
