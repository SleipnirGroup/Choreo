import ContentCopy from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import DriveFileRenameOutline from "@mui/icons-material/DriveFileRenameOutline";
import MoreVert from "@mui/icons-material/MoreVert";
import ShapeLine from "@mui/icons-material/ShapeLine";
import {
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Tooltip,
  Typography
} from "@mui/material";
import { confirm } from "@tauri-apps/plugin-dialog";
import { observer } from "mobx-react";
import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  deletePath,
  doc,
  renamePath,
  uiState
} from "../../document/DocumentManager";
import { NameIssue } from "../../document/path/NameIsIdentifier";
import styles from "./HomePage.module.css";
import PathPreview from "./PathPreview";

const PathCard = observer(({ uuid }: { uuid: string }) => {
  const path = doc.pathlist.paths.get(uuid)!;
  const [menuPos, setMenuPos] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<NameIssue | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const openEditor = () => {
    toast.dismiss();
    doc.pathlist.setActivePathUUID(uuid);
    uiState.navigateToEditor();
  };

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuPos({ left: e.clientX, top: e.clientY });
  };

  const closeMenu = () => setMenuPos(null);

  const startRename = () => {
    closeMenu();
    setName(path.name);
    setNameError(undefined);
    setRenaming(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commitRename = () => {
    if (nameError === undefined && name !== path.name) {
      renamePath(uuid, name);
    }
    setRenaming(false);
  };

  const checkName = (n: string) => {
    setNameError(doc.pathlist.validateName(n, uuid));
    setName(n);
  };

  return (
    <>
      <Paper
        className={styles.PathCard}
        onClick={renaming ? undefined : openEditor}
        onContextMenu={openMenu}
        elevation={0}
      >
        <div className={styles.PathCardPreview}>
          <PathPreview uuid={uuid} />
        </div>
        <div
          className={styles.PathCardFooter}
          onClick={(e) => e.stopPropagation()}
        >
          {renaming ? (
            <Tooltip
              disableInteractive
              open={nameError !== undefined}
              title={nameError?.uiMessage ?? ""}
              placement="bottom"
              arrow
            >
              <input
                ref={inputRef}
                value={name}
                autoFocus
                spellCheck={false}
                className={
                  styles.RenameInput +
                  (nameError ? " " + styles.RenameInputError : "")
                }
                onChange={(e) => checkName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                onBlur={commitRename}
              />
            </Tooltip>
          ) : (
            <Typography className={styles.PathName}>{path.name}</Typography>
          )}
          <Tooltip disableInteractive title="More options">
            <IconButton
              size="small"
              className={styles.MoreBtn}
              onClick={openMenu}
            >
              <MoreVert sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </div>
      </Paper>

      <Menu
        open={menuPos !== null}
        onClose={closeMenu}
        anchorReference="anchorPosition"
        anchorPosition={menuPos ?? undefined}
      >
        <MenuItem onClick={startRename}>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu();
            doc.pathlist.duplicatePath(uuid);
          }}
        >
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem
          disabled={path.ui.upToDate || path.ui.generating}
          onClick={() => {
            closeMenu();
            doc.generatePath(uuid);
          }}
        >
          <ListItemText>Generate</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          sx={{ color: "#f44336" }}
          onClick={() => {
            closeMenu();
            confirm(`Delete "${path.name}"?`).then((r) => {
              if (r) deletePath(uuid);
            });
          }}
        >
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
});

export default PathCard;
