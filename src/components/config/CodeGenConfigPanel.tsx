import { observer } from "mobx-react";
import { Button, Checkbox, FormControlLabel, Stack } from "@mui/material";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { codeGenDialog, doc } from "../../document/DocumentManager";
import { ReactNode } from "react";

function OpenFolderButton(args: { children?: ReactNode }) {
  return (
    <Button
      variant="contained"
      startIcon={<FolderOpenIcon />}
      onClick={() => codeGenDialog()}
    >
      {args.children}
    </Button>
  );
}

function CodeGenConfigPanel() {
  const rowGap = 16;
  const containerStyle: React.CSSProperties = {
    fontSize: "1rem",
    marginTop: `${1 * rowGap}px`,
    marginBottom: `${1 * rowGap}px`,
    marginLeft: "45px",
    marginRight: "40px",
    width: "max-content"
  };

  if (!doc.codegen.root) {
    return (
      <div style={containerStyle}>
        <Stack spacing={2} direction="column">
          <p>
            Choreo can generate Java files to ensure consistency between your{" "}
            <br />
            robot code and trajectories. Visit the documentation for more
            details.
          </p>
          <OpenFolderButton>Choose Folder for Generated Files</OpenFolderButton>
        </Stack>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <Stack spacing={2} direction="column">
        <OpenFolderButton>Change Folder for Generated Files</OpenFolderButton>
        <Stack spacing={1}>
          <FormControlLabel
            control={
              <Checkbox
                checked={doc.codegen.genVars}
                onChange={(_, value) => doc.codegen.setGenVars(value)}
              />
            }
            label="Generate Variables File"
            style={{ gap: 10 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={doc.codegen.genTrajData}
                onChange={(_, value) => doc.codegen.setGenTrajData(value)}
              />
            }
            label="Generate Trajectory Data File (name, start & end pose, total time)"
            style={{ gap: 10 }}
          />
        </Stack>
      </Stack>
    </div>
  );
}

export default observer(CodeGenConfigPanel);
