const fs = require('fs');

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
      dylibPattern = "lib*.so";
      break;
  }

  return dylibPattern;
}

exports.getDylibPattern = getDylibPattern;
