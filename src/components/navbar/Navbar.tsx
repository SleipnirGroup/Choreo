import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import Tooltip from "@mui/material/Tooltip";
import styles from "./Navbar.module.css";
import { observer } from "mobx-react";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { NavbarItemData } from "../../document/UIStateStore";

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
        <ToggleButtonGroup
          className={styles.ToggleGroup}
          exclusive
          value={`${selectedNavbarItem}`}
          onChange={(e, newSelection) => {
            console.log(newSelection);
            setSelectedNavbarItem(Number.parseInt(newSelection) ?? -1);
          }}
        >
          {NavbarItemData.map((item, index) => (
            <Tooltip title={item.name}>
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
          ))}
        </ToggleButtonGroup>
        {/* </span> */}
      </div>
    );
  }
}
export default observer(Navbar);
