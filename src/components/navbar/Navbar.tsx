import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import Tooltip from "@mui/material/Tooltip";
import styles from "./Navbar.module.css";
import { observer } from "mobx-react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import {
  NavbarItemData,
  NavbarItemSectionEnds
} from "../../document/UIStateStore";

type Props = object;

type State = object;

class Navbar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
  declare context: React.ContextType<typeof DocumentManagerContext>;
  state = {};

  render() {
    const { selectedNavbarItem, setSelectedNavbarItem } =
      this.context.model.uiState;
    return (
      <div className={styles.Container}>
        {NavbarItemSectionEnds.map((endSplit, sectionIdx) =>
          sectionIdx != 2 || this.context.model.document.usesObstacles ? (
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
                  index > (NavbarItemSectionEnds[sectionIdx - 1] ?? -1) && (
                    <Tooltip
                      disableInteractive
                      //@ts-expect-error needs a value prop for ToggleButtonGroup
                      value={`${index}`}
                      title={item.name}
                      key={`${sectionIdx}_${index}`}
                    >
                      <ToggleButton
                        value={`${index}`}
                        sx={{
                          color: "var(--accent-purple)",
                          "&.Mui-selected": {
                            color: "var(--select-yellow)"
                          }
                        }}
                      >
                        {item.icon}
                      </ToggleButton>
                    </Tooltip>
                  )
              )}
            </ToggleButtonGroup>
          ) : (
            <></>
          )
        )}
      </div>
    );
  }
}
export default observer(Navbar);
