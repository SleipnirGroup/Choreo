import Add from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import { InputAdornment, TextField, Typography } from "@mui/material";
import { observer } from "mobx-react";
import { useState } from "react";
import { doc, uiState } from "../../document/DocumentManager";
import HomeNavbar from "./HomeNavbar";
import styles from "./HomePage.module.css";
import PathCard from "./PathCard";

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

const HomePage = observer(() => {
  const [query, setQuery] = useState("");
  const allUUIDs = Array.from(doc.pathlist.paths.keys());
  const pathUUIDs = query
    ? allUUIDs.filter((uuid) => {
        const name = doc.pathlist.paths.get(uuid)?.name ?? "";
        return fuzzyMatch(query, name);
      })
    : allUUIDs;

  const addAndOpen = () => {
    doc.pathlist.addPath("NewPath", true);
  };

  return (
    <div className={styles.Container}>
      <HomeNavbar />

      <div className={styles.Content}>
        <TextField
          className={styles.SearchBar}
          placeholder="Search paths…"
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: "rgba(255,255,255,0.4)" }} />
                </InputAdornment>
              )
            }
          }}
        />

        <div className={styles.PathGrid}>
          {pathUUIDs.map((uuid) => (
            <PathCard uuid={uuid} key={uuid} />
          ))}
          {!query && (
            <div className={styles.AddPathCard} onClick={addAndOpen}>
              <div className={styles.AddPathPreview}>
                <Add sx={{ fontSize: 40, color: "var(--accent-purple)" }} />
              </div>
              <div className={styles.PathCardFooter}>
                <Typography className={styles.PathName}>New Path</Typography>
              </div>
            </div>
          )}
        </div>

        {query && pathUUIDs.length === 0 && (
          <Typography
            sx={{ color: "gray", fontStyle: "italic", textAlign: "center", mt: 6 }}
          >
            No paths match "{query}"
          </Typography>
        )}
      </div>
    </div>
  );
});

export default HomePage;
