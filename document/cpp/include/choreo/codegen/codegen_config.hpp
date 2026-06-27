/*
pub struct CodeGenConfig {
    root: Option<String>,
    pub gen_vars: bool,
    pub gen_traj_data: bool,
    pub use_choreo_lib: bool,
}

impl CodeGenConfig {
    pub fn get_root(&self) -> Option<String> {
        let root = self.root.as_ref().map(|r| {
            r.replace("\\", std::path::MAIN_SEPARATOR_STR)
                .replace("/", std::path::MAIN_SEPARATOR_STR)
        });
        tracing::debug!("Codegen root: {:?}", root);
        root
    }
}
*/

#pragma once

#include <optional>
#include <regex>
#include <string>
#include <filesystem>
#include <wpi/util/json.hpp>
namespace choreo {
    struct CodeGenConfig {
        std::optional<std::string> root;
        bool genVars = true;
        bool genTrajData = true;
        bool useChoreoLib = true;

        std::optional<std::string> get_root() const {
            if (root.has_value()) {
                std::string r = root.value();
                r = std::regex_replace(r, std::regex(R"(\\|/)"), std::string(1, std::filesystem::path::preferred_separator));
                return r;
            }
            return std::nullopt;
        }
    };
    inline void from_json(const wpi::util::json& json, CodeGenConfig& config) {
        if (json.contains("root")) {
            config.root = json.at("root").get_string();
        }
        if (json.contains("genVars")) {
            config.genVars = json.at("genVars").get_bool();
        }
        if (json.contains("genTrajData")) {
            config.genTrajData = json.at("genTrajData").get_bool();
        }
        if (json.contains("useChoreoLib")) {
            config.useChoreoLib = json.at("useChoreoLib").get_bool();
        }
    }
    inline void to_json(wpi::util::json& json, const CodeGenConfig& config) {
        json = wpi::util::json::object(
            "root", config.root.has_value() ? config.root.value() : "",
            "genVars", config.genVars,
            "genTrajData", config.genTrajData,
            "useChoreoLib", config.useChoreoLib
        );
    }
}