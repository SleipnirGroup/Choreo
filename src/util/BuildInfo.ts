import { invoke } from "@tauri-apps/api/tauri";

export interface BuildInfo {
  ciPlatform: string | null;
  pkgName: string;
  pkgVersion: string;
  pkgVersionMajor: string;
  pkgVersionMinor: string;
  pkgVersionPatch: string;
  pkgVersionPre: string;
  target: string;
  host: string;
  profile: string;
  rustc: string;
  optLevel: string;
  debug: boolean;
  features: string[];
  rustcVersion: string;
  arch: string;
  endian: string;
  toolchain_env: string;
  osFamily: string;
  os: string;
  deps: [string, string][];
  direct_deps: [string, string][];
  indirect_deps: [string, string][];
  build_time: string;
}

export function getBuildInfo(): Promise<BuildInfo> {
  return invoke<BuildInfo>("build_info");
}
