const fs = require("fs");
const { exit } = require("process");

const [name, newPathRoot] = process.argv.slice(2);

const extension = process.env.TAURI_FAMILY === "windows" ? ".exe" : "";
const targetTriple = process.env.TAURI_TARGET_TRIPLE;

const oldPathNative = `./target/release/${name}${extension}`;
const oldPath = `./target/${targetTriple}/release/${name}${extension}`;
const newPath = `${newPathRoot}/${name}-${targetTriple}${extension}`;

let path;
if (fs.existsSync(oldPathNative)) {
  path = oldPathNative;
} else if (fs.existsSync(oldPath)) {
  path = oldPath;
} else {
  console.log(`No file found at ${oldPathNative} or ${oldPath}`);
  exit(1);
}

fs.copyFile(path, newPath, (err) => {
  if (err) {
    console.error(`Error copying ${path} to ${newPath}: ${err}`);
    exit(1);
  }
  console.log(`Copied ${path} to ${newPath}`);
});
