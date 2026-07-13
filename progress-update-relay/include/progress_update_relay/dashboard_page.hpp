#pragma once

#include <string>

#include "progress_update_relay/options.hpp"

namespace progress_update_relay {

std::string BuildDashboardHtml(const CliOptions& options);

}  // namespace progress_update_relay
