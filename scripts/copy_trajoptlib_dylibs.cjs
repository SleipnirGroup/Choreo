const { execSync } = require("child_process");
const fs = require("fs");
const glob = require("glob");
const path = require("path");

console.log("Writing dummy resource file to: " + getDummyResourcePath());
generateDummyDylib();

console.log("Building trajoptlib dylibs");
execSync("cd " + getSrcTauriPath() + " && cargo build --release");

console.log("Copying trajoptlib dylibs to src-tauri/");
copyDylibs();

console.log("Deleting dummy file: " + getDummyResourcePath());
fs.rmSync(getDummyResourcePath());

if (process.platform === "win32") {
  console.log("Copying WebView2Loader.dll");
  fs.copyFileSync(
    getSrcTauriPath() + "/target/release/WebView2Loader.dll",
    getSrcTauriPath() + "/WebView2Loader.dll"
  );
}

console.log("Cargo clean");
execSync("cd " + getSrcTauriPath() + " && cargo clean");

function generateDummyDylib() {
  fs.writeFileSync(
    getDummyResourcePath(),
    "dummy file (see \"scripts/build_utils.cjs\")"
  );

}

function copyDylibs() {
  let dylibDirPrefix = "lib";

  if (process.platform === "win32") {
    dylibDirPrefix = "bin";
  }

  const dylibs = glob.sync(
    getSrcTauriPath() +
      "/target/**/release/build/trajoptlib-*/out/" +
      dylibDirPrefix +
      "/" +
      getDylibPattern()
  );

  dylibs.forEach((dylib) => {
    fs.copyFileSync(dylib, getSrcTauriPath() + "/" + path.basename(dylib));
  });
}

function getSrcTauriPath() {
  return __dirname + "/../src-tauri";
}

function getDylibPattern() {
  let dylibPattern = "*";

  switch (process.platform) {
    case "win32":
      dylibPattern = "*.dll";
      break;
    case "darwin":
      dylibPattern = "lib*.dylib";
      break;
    case "linux":
      dylibPattern = "lib*.so*";
      break;
  }

  return dylibPattern;
}

// Path to dummy file, which is created so Tauri doesn't get upset that it can't find any
// resources with the "*.dll" glob pattern. This can be removed once tauri removes this "feature".
// This file only exists during the trajoptlib dylib build stage. Once
// that is completed, the file is deleted.
function getDummyResourcePath() {
  return getSrcTauriPath() + "/" + getDylibPattern().replace("*", "dummy");
}
