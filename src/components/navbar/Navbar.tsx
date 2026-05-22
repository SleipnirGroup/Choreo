import { Polyline, Redo, Settings, Undo } from "@mui/icons-material";
import { IconButton, ToggleButton, ToggleButtonGroup } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import { observer } from "mobx-react";
import { Component } from "react";
import { doc, uiState } from "../../document/DocumentManager";
import { NavbarItemData, NavbarItemSectionEnds } from "../../document/UIData";
import styles from "./Navbar.module.css";

type Props = object;

type State = object;

class Navbar extends Component<Props, State> {
  state = {};

  render() {
    const { selectedNavbarItem, setSelectedNavbarItem } = uiState;
    return (
      <div className={styles.Container}>
        {NavbarItemSectionEnds.map((endSplit, sectionIdx) => (
          <ToggleButtonGroup
            className={styles.ToggleGroup}
            sx={{ alignSelf: "center", height: "fit-content" }}
            exclusive
            value={`${selectedNavbarItem}`}
            onChange={(_e, newSelection) => {
              setSelectedNavbarItem(Number.parseInt(newSelection) ?? -1);
            }}
            key={sectionIdx}
          >
            {NavbarItemData.map(
              (item, index) =>
                index <= endSplit &&
                index > (NavbarItemSectionEnds[sectionIdx - 1] ?? -1) && (
                  <Tooltip
                    disableInteractive
                    //@ts-expect-error needs a value prop for ToggleButtonGroup
                    value={`${index}`}
                    title={item.name}
                    key={item.name}
                  >
                    <ToggleButton
                      value={`${index}`}
                      sx={{
                        color: "var(--accent-purple)",
                        "&.Mui-selected": {
                          color: "var(--select-yellow)"
                        }
                      }}
                      key={item.name}
                    >
                      {item.icon}
                    </ToggleButton>
                  </Tooltip>
                )
            )}
          </ToggleButtonGroup>
        ))}
        <div style={{ flex: 1 }} />
        <Tooltip disableInteractive title="Edit Robot Config">
          <IconButton onClick={() => uiState.setRobotConfigOpen(true)}>
            <Settings />
          </IconButton>
        </Tooltip>
        <Tooltip disableInteractive title="Regenerate All Paths">
          <IconButton onClick={() => doc.generateAll()}>
            <Polyline />
          </IconButton>
        </Tooltip>
        <Tooltip disableInteractive title="Undo">
          <span>
            <IconButton
              disabled={!doc.history.canUndo}
              onClick={() => doc.undo()}
            >
              <Undo />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip disableInteractive title="Redo">
          <span>
            <IconButton
              disabled={!doc.history.canRedo}
              onClick={() => doc.redo()}
            >
              <Redo />
            </IconButton>
          </span>
        </Tooltip>
      </div>
    );
  }
}
export default observer(Navbar);
