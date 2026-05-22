import Add from "@mui/icons-material/Add";
import { Typography } from "@mui/material";
import { observer } from "mobx-react";
import { doc, uiState } from "../../document/DocumentManager";
import HomeNavbar from "./HomeNavbar";
import styles from "./HomePage.module.css";
import PathCard from "./PathCard";

const HomePage = observer(() => {
  const pathUUIDs = Array.from(doc.pathlist.paths.keys());

  const addAndOpen = () => {
    doc.pathlist.addPath("NewPath", true);
    uiState.navigateToEditor();
  };

  return (
    <div className={styles.Container}>
      <HomeNavbar />

      <div className={styles.Content}>
        <div className={styles.PathGrid}>
          {pathUUIDs.map((uuid) => (
            <PathCard uuid={uuid} key={uuid} />
          ))}
          <div className={styles.AddPathCard} onClick={addAndOpen}>
            <div className={styles.AddPathPreview}>
              <Add sx={{ fontSize: 40, color: "var(--accent-purple)" }} />
            </div>
            <div className={styles.PathCardFooter}>
              <Typography className={styles.PathName}>New Path</Typography>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default HomePage;
