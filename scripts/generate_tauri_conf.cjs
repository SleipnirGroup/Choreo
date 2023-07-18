const fs = require("fs");

const bu = require("./build_utils.cjs");

console.log("Using dylib pattern: \"" + bu.getDylibPattern() + "\"");

console.log("Writing dummy resource file to: " + bu.getDummyResourcePath());
fs.writeFileSync(bu.getDummyResourcePath(), "dummy file (see \"scripts/build_utils.cjs\")");

// The following step adds os-specific resources to the tauri bundle by
// modifying the tauri.conf.json file. This step can be removed once
// tauri allows this kind of resource pattern: "*.{dll,dylib,so}".
let tauriConfJsonRaw = fs.readFileSync(bu.getSrcTauriPath() + "/tauri.conf.in.json");
let tauriConfJson = JSON.parse(tauriConfJsonRaw);

tauriConfJson.tauri.bundle.resources = [bu.getDylibPattern()];

const modifiedTauriConf = JSON.stringify(tauriConfJson, null, 2) + "\n";

// Write the modified tauri configuration
fs.writeFileSync(bu.getSrcTauriPath() + "/tauri.conf.json", modifiedTauriConf);
