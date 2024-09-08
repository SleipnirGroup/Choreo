const fs = require("fs");
const { exit } = require("process");

const [name, newPathRoot] = process.argv.slice(2);

let targetTriple = "";
let extension = "";

const platType = process.env.TAURI_PLATFORM_TYPE;
const platArch = process.env.TAURI_ARCH;
if (platType === "Darwin") {
  targetTriple = `${platArch}-apple-darwin`;
} else if (platType === "Linux") {
  targetTriple = `${platArch}-unknown-linux-gnu`;
} else if (platType === "Windows_NT") {
  targetTriple = `${platArch}-pc-windows-msvc`;
  extension = ".exe";
}

const newPath = `${newPathRoot}/${name}-${targetTriple}${extension}`;
const oldPathNative = `./target/release/${name}${extension}`;
const oldPath = `./target/${targetTriple}/release/${name}${extension}`;

const oldPathNativeExists = fs.existsSync(`${oldPathNative}`);
const oldPathExists = fs.existsSync(`${oldPath}`);

if (!oldPathNativeExists && !oldPathExists) {
  console.log(`No file found at ${oldPathNative} or ${oldPath}`);
  exit(1);
}

const path = oldPathNativeExists ? oldPathNative : oldPath;

fs.rename(path, newPath, (err) => {
  if (err) {
    console.error(`Error renaming ${oldPath} to ${newPath}: ${err}`);
    exit(1);
  }
  console.log(`Renamed ${oldPath} to ${newPath}`);
});
