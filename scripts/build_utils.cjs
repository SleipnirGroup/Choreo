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
  const initReplaced = getDylibPattern().replace("*", "dummy");
  const dummyDylibName =
    process.platform === "linux" ? initReplaced.replace("*", "") : initReplaced;
  return getSrcTauriPath() + "/" + dummyDylibName;
}

exports.getSrcTauriPath = getSrcTauriPath;
exports.getDylibPattern = getDylibPattern;
exports.getDummyResourcePath = getDummyResourcePath;
