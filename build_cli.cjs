const { exec, execSync } = require("child_process");
const fs = require("fs");

console.log("Building CLI...");

function getTargetTriple() {
  let targetTriple = "";
  let extension = "";

  if (process.env.TAURI_PLATFORM_TYPE) {
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
  } else {
    // get host out of rustc -Vv output
    const rustcVv = execSync("rustc -Vv").toString();
    const host = rustcVv.match(/host: (.*)\n/)[1];
    targetTriple = host;
    if (host.includes("windows")) {
      extension = ".exe";
    }
  }

  console.log("Target triple: " + targetTriple);
  return { targetTriple, extension };
}

const { targetTriple, extension } = getTargetTriple();

// create cli directory if it doesn't exist
if (!fs.existsSync("cli")) {
  fs.mkdirSync("cli");
}

// remove existing cli files
fs.readdir("cli", (err, files) => {
  if (err) throw err;

  for (const file of files) {
    fs.unlink(`cli/${file}`, (err) => {
      if (err) throw err;
    });
  }
});

const cliPath = `cli/choreo-cli-${targetTriple}${extension}`;

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
  fs.copyFileSync(
    `target/${targetTriple}/release/choreo-cli${extension}`,
    `cli/choreo-cli${extension}`
  );
  fs.renameSync(
    `target/${targetTriple}/release/choreo-cli${extension}`,
    cliPath
  );
});
