// const util = require('util');
// const exec = util.promisify(require('child_process').exec);
const {execSync} = require('child_process')
const fs = require("fs");
const glob = require("glob");
const path = require("path");

const {getDylibPattern} = require("./build_utils.cjs");

const srcTauriPath = __dirname + "/../src-tauri";

const dylibPattern = getDylibPattern();

function copyDylibs() {

  let dylibDirPrefix = "lib";

  if (process.platform === "win32") {
    dylibDirPrefix = "bin";
  }

  const dylibs = glob.sync(srcTauriPath + "/target/debug/build/trajoptlib-*/out/" + dylibDirPrefix + "/" + dylibPattern);

  dylibs.forEach(dylib => {
    fs.copyFileSync(dylib, srcTauriPath + "/" + path.basename(dylib));
  });
}

try {
  execSync("cd " + srcTauriPath + " && cargo build");
} finally {
  copyDylibs();
}