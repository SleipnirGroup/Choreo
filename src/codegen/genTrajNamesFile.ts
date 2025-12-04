export const TRAJ_NAMES_FILENAME = "ChoreoTrajNames";

export function genTrajNamesFile(
  trajNames: string[],
  packageName: string
): string {
  const content: string[] = [];
  const usedVarNames: Record<string, number> = {};
  content.push(`package ${packageName};`);
  content.push(`
/**
 * A class containing the names of all trajectories created in the choreo GUI.
 * This allows for references of non-existent or deleted trajectories
 * to be caught at compile time. DO NOT MODIFY THIS FILE YOURSELF!
 */
public class ${TRAJ_NAMES_FILENAME} {`);
  for (const trajName of trajNames) {
    let varName = sanitizeTrajName(trajName);
    const dupeCount = usedVarNames[varName];
    if (dupeCount > 0) {
      varName += `_${dupeCount}`;
      usedVarNames[varName] = dupeCount + 1;
    } else {
      usedVarNames[varName] = 1;
    }
    content.push(`    public static final String ${varName} = "${trajName}";`);
  }
  content.push("");
  content.push(`    private ${TRAJ_NAMES_FILENAME}() {}`);
  content.push("}");
  return content.join("\n");
}

function sanitizeTrajName(trajName: string): string {
  let newName = trajName;
  for (let i = 0; i < newName.length; i++) {
    const char = newName.charAt(i);
    if (char !== " ") continue;
    newName =
      newName.slice(0, i) +
      newName.charAt(i + 1).toUpperCase() +
      newName.slice(i + 2);
  }
  newName = newName.replaceAll(/[^\w|^$]/g, "");
  if (newName.charAt(0).match(/[0-9]/)) {
    newName = "_" + newName;
  }
  return newName;
}
