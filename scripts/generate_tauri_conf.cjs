const fs = require("fs");

const {getDylibPattern} = require("./build_utils.cjs");

const srcTauriPath = __dirname + "/../src-tauri";

const dylibPattern = getDylibPattern();

console.log("Using dylib pattern: \"" + dylibPattern + "\"");

// Create dummy file so Tauri doesn't get upset that it can't find any
// resources. This can be removed once tauri removes this "feature".
// This file only exists during the trajoptlib dylib build stage. Once
// that is completed, the file can be deleted.
const dummyFilePath = srcTauriPath + "/" + dylibPattern.replace("*", "dummy");
console.log("Writing dummy resource file to: " + dummyFilePath);
fs.writeFileSync(dummyFilePath, "dummy file");

// The following step adds os-specific resources to the tauri bundle by
// modifying the tauri.conf.json file. This step can be removed once
// tauri allows this kind of resource pattern: "*.{dll,dylib,so}".

let tauriConfJsonRaw = fs.readFileSync(srcTauriPath + "/tauri.conf.in.json");
let tauriConfJson = JSON.parse(tauriConfJsonRaw);

tauriConfJson.tauri.bundle.resources = [dylibPattern];

const modifiedTauriConf = JSON.stringify(tauriConfJson, null, 2) + "\n";

// Write the modified tauri configuration
fs.writeFileSync(srcTauriPath + "/tauri.conf.json", modifiedTauriConf);
