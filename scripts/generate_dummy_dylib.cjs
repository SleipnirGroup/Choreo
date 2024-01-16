const fs = require("fs");

const bu = require("./build_utils.cjs");

console.log('Using dylib pattern: "' + bu.getDylibPattern() + '"');

console.log("Writing dummy resource file to: " + bu.getDummyResourcePath());
fs.writeFileSync(
  bu.getDummyResourcePath(),
  'dummy file (see "scripts/build_utils.cjs")'
);
