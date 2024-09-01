const { exec, execSync } = require("child_process");
const fs = require("fs");

console.log("Building CLI...");

// console.log(process.env.TAURI_PLATFORM);
// console.log(process.env.TAURI_ARCH);
// console.log(process.env.TAURI_FAMILY);
// console.log(process.env.TAURI_PLATFORM_VERSION);
// console.log(process.env.TAURI_PLATFORM_TYPE);
// console.log(process.env.TAURI_DEBUG);

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

console.log("Target triple: " + targetTriple);

if (!fs.existsSync("cli")) {
  fs.mkdirSync("cli");
}

const cliPath = `cli/choreo-cli-${targetTriple}${extension}`;

if (process.env.TAURI_DEBUG && !fs.existsSync(cliPath)) {
  fs.writeFileSync(cliPath, "");
  return;
}

// build cli
const build = exec(
  `cargo build --release -p choreo-cli --target ${targetTriple}`
);
// build.stdout.on("data", (data) => process.stdout.write(data));
build.stdout.pipe(process.stdout);
build.stderr.on("data", (data) => console.error(data));

// move and rename cli
build.once("exit", (code) => {
  if (code !== 0) {
    throw new Error("Build failed");
  }
  if (fs.existsSync(cliPath)) {
    fs.unlinkSync(cliPath);
  }
  execSync(
    `mv target/${targetTriple}/release/choreo-cli${extension} ${cliPath} -f`
  );
});
