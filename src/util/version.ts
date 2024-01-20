import { getVersion } from "@tauri-apps/api/app";

export let version: string = "unknown";

getVersion().then((v) => (version = v));
