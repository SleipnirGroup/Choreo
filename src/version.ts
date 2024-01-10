import { invoke } from "@tauri-apps/api";

export let version: string = "unknown";

invoke<string>("get_version").then((v) => (version = v));
