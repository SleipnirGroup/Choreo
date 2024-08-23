import React, { Component } from "react";
import { doc, uiState } from "../../document/DocumentManager";
import Tooltip from "@mui/material/Tooltip";
import styles from "./Navbar.module.css";
import { observer } from "mobx-react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { NavbarItemData, NavbarItemSectionEnds } from "../../document/UIData";

type Props = object;

type State = object;

class Navbar extends Component<Props, State> {
  state = {};

  render() {
    const { selectedNavbarItem, setSelectedNavbarItem } = uiState;
    return (
      <div className={styles.Container}>
        {NavbarItemSectionEnds.map((endSplit, sectionIdx) =>
          sectionIdx != 2 || doc.usesObstacles ? (
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
