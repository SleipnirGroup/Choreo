const fs = require("fs");

const [oldPath, newPathRoot] = process.argv.slice(2);

let fileName = oldPath.split("/").pop().split(".")[0];

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

const newPath = `${newPathRoot}/${fileName}-${targetTriple}${extension}`;

fs.rename(`${oldPath}${extension}`, newPath, (err) => {
    if (err) throw err;
    console.log(`Renamed ${oldPath} to ${newPath}`);
});