import MenuIcon from "@mui/icons-material/Menu";
import Redo from "@mui/icons-material/Redo";
import ShapeLine from "@mui/icons-material/ShapeLine";
import Undo from "@mui/icons-material/Undo";
import { IconButton, Tooltip, Typography } from "@mui/material";
import { observer } from "mobx-react";
import { doc, uiState } from "../../document/DocumentManager";
import ProjectSaveStatusIndicator from "../sidebar/ProjectSaveStatusIndicator";
import styles from "./HomePage.module.css";

const HomeNavbar = observer(() => {
  const pathUUIDs = Array.from(doc.pathlist.paths.keys());

  return (
    <div className={styles.TopBar}>
      <span className={styles.TopBarLeft}>
        <Tooltip disableInteractive title="Main Menu">
          <IconButton onClick={() => uiState.toggleMainMenu()}>
            <MenuIcon />
          </IconButton>
        </Tooltip>
        <Typography style={{ fontWeight: 500 }}>Choreo</Typography>
      </span>
      <span className={styles.TopBarRight}>
        <ProjectSaveStatusIndicator savingState={uiState.projectSavingState} />
        <Tooltip disableInteractive title="Regenerate all paths">
          <span>
            <IconButton
              disabled={pathUUIDs.length === 0}
              onClick={() => doc.generateAllOutdated()}
            >
              <ShapeLine />
            </IconButton>
          </span>
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
      </span>
    </div>
  );
});

export default HomeNavbar;
