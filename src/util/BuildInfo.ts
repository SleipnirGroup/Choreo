import { invoke } from "@tauri-apps/api/tauri";

export interface BuildInfo {
  ci_platform: string | null;
  pkg_name: string;
  pkg_version: string;
  pkg_version_major: string;
  pkg_version_minor: string;
  pkg_version_patch: string;
  pkg_version_pre: string;
  target: string;
  host: string;
  profile: string;
  rustc: string;
  opt_level: string;
  debug: boolean;
  features: string[];
  features_str: string;
  rustc_version: string;
  arch: string;
  endian: string;
  toolchain_env: string;
  os_family: string;
  os: string;
  deps: [string, string][];
  direct_deps: [string, string][];
  indirect_deps: [string, string][];
  build_time: string;
}

export function getBuildInfo(): Promise<BuildInfo> {
  return invoke<BuildInfo>("build_info");
}
