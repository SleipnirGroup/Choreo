import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import Tooltip from "@mui/material/Tooltip";
import styles from "./Navbar.module.css";
import { observer } from "mobx-react";
import { Divider, ToggleButton, ToggleButtonGroup } from "@mui/material";
import {
  NavbarItemData,
  NavbarItemSectionLengths,
  NavbarItemSplitPoints,
} from "../../document/UIStateStore";

type Props = {};

type State = {};

class Navbar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  // @ts-ignore
  context!: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    let { selectedNavbarItem, setSelectedNavbarItem } =
      this.context.model.uiState;
    return (
      <div className={styles.Container}>
        {NavbarItemSectionLengths.map((endSplit, sectionIdx) => (
          <ToggleButtonGroup
            className={styles.ToggleGroup}
            exclusive
            value={`${selectedNavbarItem}`}
            onChange={(e, newSelection) => {
              setSelectedNavbarItem(Number.parseInt(newSelection) ?? -1);
            }}
            key={sectionIdx}
          >
            {NavbarItemData.map(
              (item, index) =>
                index <= endSplit &&
                index > (NavbarItemSectionLengths[sectionIdx - 1] ?? -1) && (
                  //@ts-ignore
                  <Tooltip
                    disableInteractive
                    value={`${index}`}
                    title={item.name}
                    key={`${sectionIdx}_${index}`}
                  >
                    <ToggleButton
                      value={`${index}`}
                      sx={{
                        color: "var(--accent-purple)",
                        "&.Mui-selected": {
                          color: "var(--select-yellow)",
                        },
                      }}
                    >
                      {item.icon}
                    </ToggleButton>
                  </Tooltip>
                )
            )}
          </ToggleButtonGroup>
        ))}

        {/* </span> */}
      </div>
    );
  }
}
export default observer(Navbar);
