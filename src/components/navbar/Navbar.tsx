import React, { Component } from "react";
import DocumentManagerContext from "../../document/DocumentManager";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/UploadFile";
import MenuIcon from "@mui/icons-material/Menu";
import IconButton from "@mui/material/IconButton";
import FileDownload from "@mui/icons-material/FileDownload";
import Tooltip from "@mui/material/Tooltip";
import styles from "./Navbar.module.css";
import { observer } from "mobx-react";
import Divider from "@mui/material/Divider";
import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { NavbarItemData } from "../../document/UIStateStore";
import { NoteAddOutlined } from "@mui/icons-material";

type Props = {};

type State = {};

class Navbar extends Component<Props, State> {
  static contextType = DocumentManagerContext;
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
            <Tooltip value={`${index}`} title={item.name}>
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
