const { exec, execSync } = require("child_process");
const fs = require("fs");

function get_executable_extension() {
  if (process.env.TAURI_PLATFORM === "windows") {
    return ".exe";
  }
  return "";
}

console.log("Building CLI...");

console.log(process.env.TAURI_PLATFORM);
console.log(process.env.TAURI_ARCH);
console.log(process.env.TAURI_FAMILY);
console.log(process.env.TAURI_PLATFORM_VERSION);
console.log(process.env.TAURI_PLATFORM_TYPE);
console.log(process.env.TAURI_DEBUG);

// build cli
const build = exec("cargo build --release -p choreo-cli");
build.stdout.on("data", (data) => print(data, (end = "")));
build.stderr.on("data", (data) => console.error(data));

// get target triple
let targetTriple = "";
const output = execSync("rustc -vV").toString();
for (const line of output.split("\n")) {
  if (line.includes("host")) {
    targetTriple = line.split(" ")[1];
  }
}
if (targetTriple === "") {
  throw new Error("Could not find target triple: " + output);
}

// move and rename cli
const executableExtension = get_executable_extension();
build.once("exit", (code) => {
  if (code !== 0) {
    throw new Error("Build failed");
  }
  if (!fs.existsSync("cli")) {
    fs.mkdirSync("cli");
  }
  execSync(
    `mv target/release/choreo-cli${executableExtension} cli/choreo-cli-${targetTriple}${executableExtension}`
  );
});
