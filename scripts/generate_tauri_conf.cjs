const fs = require('fs');
const { platform } = require('os');

let dylibPattern = "*";

switch (process.platform) {
  case "win32":
    dylibPattern = "*.dll";
    break;
  case "darwin":
    dylibPattern = "lib*.dylib";
    break;
  case "linux":
    dylibPattern = "lib*.so";
    break;
}
console.log("Using dylib pattern: \"" + dylibPattern + "\"");

// The following step adds os-specific resources to the tauri bundle by
// modifying the tauri.conf.json file. This step can be removed once
// tauri allows this kind of resource pattern: "*.{dll,dylib,so}".

let tauriConfJsonRaw = fs.readFileSync('src-tauri/tauri.conf.in.json');
let tauriConfJson = JSON.parse(tauriConfJsonRaw);

tauriConfJson.tauri.bundle.resources = [dylibPattern];

const modifiedTauriConf = JSON.stringify(tauriConfJson, null, 2) + "\n";

// Write the modified tauri configuration
fs.writeFileSync('src-tauri/tauri.conf.json', modifiedTauriConf);
