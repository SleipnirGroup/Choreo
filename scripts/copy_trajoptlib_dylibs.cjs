const {execSync} = require('child_process')
const fs = require("fs");
const glob = require("glob");
const path = require("path");

const bu = require("./build_utils.cjs");

function copyDylibs() {

  let dylibDirPrefix = "lib";

  if (process.platform === "win32") {
    dylibDirPrefix = "bin";
  }

  const dylibs = glob.sync(bu.getSrcTauriPath()
      + "/target/release/build/trajoptlib-*/out/" + dylibDirPrefix
      + "/" + bu.getDylibPattern());

  dylibs.forEach(dylib => {
    fs.copyFileSync(dylib, bu.getSrcTauriPath() + "/" + path.basename(dylib));
  });
}

console.log("Building trajoptlib dylibs")
execSync("cd " + bu.getSrcTauriPath() + " && cargo build --release");

console.log("Copying trajoptlib dylibs to src-tauri/");
copyDylibs();

console.log("Deleting dummy file: " + bu.getDummyResourcePath());
fs.rmSync(bu.getDummyResourcePath());

console.log("Cargo clean")
execSync("cd " + bu.getSrcTauriPath() + " && cargo clean");
