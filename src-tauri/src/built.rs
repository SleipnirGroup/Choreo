use std::fmt::{self, Display, Formatter};

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BuildInfo {
    pub ci_platform: Option<&'static str>,
    pub pkg_name: &'static str,
    pub pkg_version: &'static str,
    pub pkg_version_major: &'static str,
    pub pkg_version_minor: &'static str,
    pub pkg_version_patch: &'static str,
    pub pkg_version_pre: &'static str,
    pub target: &'static str,
    pub host: &'static str,
    pub profile: &'static str,
    pub rustc: &'static str,
    pub opt_level: &'static str,
    pub debug: bool,
    pub features: &'static [&'static str],
    pub rustc_version: &'static str,
    pub arch: &'static str,
    pub endian: &'static str,
    pub toolchain_env: &'static str,
    pub os_family: &'static str,
    pub os: &'static str,
    pub build_time: &'static str,
    pub git_hash: Option<&'static str>,
    pub git_branch: Option<String>,
}

impl Display for BuildInfo {
    fn fmt(&self, f: &mut Formatter<'_>) -> fmt::Result {
        writeln!(f, "{} v{}", self.pkg_name, self.pkg_version)?;
        writeln!(f, "  built with {}", self.rustc_version)?;
        writeln!(f, "  on {} for {}", self.host, self.target)?;
        writeln!(f, "  at {}", self.build_time)?;
        writeln!(f, "  with features: {:?}", self.features)?;
        writeln!(f, "  in profile {}", self.profile)?;
        writeln!(
            f,
            "  {}in ci",
            if self.ci_platform.is_some() {
                ""
            } else {
                "not "
            }
        )?;
        if let Some(git_hash) = self.git_hash {
            writeln!(
                f,
                "  from commit {} on branch {}",
                git_hash,
                self.git_branch.as_deref().unwrap_or("unknown")
            )?;
        }

        Ok(())
    }
}

mod built_info {
    include!(concat!(env!("OUT_DIR"), "/built.rs"));
}

impl BuildInfo {
    pub fn from_build() -> Self {
        Self {
            ci_platform: built_info::CI_PLATFORM,
            pkg_name: built_info::PKG_NAME,
            pkg_version: built_info::PKG_VERSION,
            pkg_version_major: built_info::PKG_VERSION_MAJOR,
            pkg_version_minor: built_info::PKG_VERSION_MINOR,
            pkg_version_patch: built_info::PKG_VERSION_PATCH,
            pkg_version_pre: built_info::PKG_VERSION_PRE,
            target: built_info::TARGET,
            host: built_info::HOST,
            profile: built_info::PROFILE,
            rustc: built_info::RUSTC,
            opt_level: built_info::OPT_LEVEL,
            debug: built_info::DEBUG,
            features: &built_info::FEATURES,
            rustc_version: built_info::RUSTC_VERSION,
            arch: built_info::CFG_TARGET_ARCH,
            endian: built_info::CFG_ENDIAN,
            toolchain_env: built_info::CFG_ENV,
            os_family: built_info::CFG_FAMILY,
            os: built_info::CFG_OS,
            build_time: built_info::BUILT_TIME_UTC,
            git_hash: built_info::GIT_COMMIT_HASH_SHORT,
            git_branch: built_info::GIT_HEAD_REF
                .map(|s| s.trim_start_matches("refs/heads/").to_string()),
        }
    }
}
