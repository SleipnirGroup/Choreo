#pragma once

#include <optional>
#include <string>
#include <string_view>

#include <wpi/net/HttpParser.hpp>

#include "choreo/rest_router/router.hpp"

namespace choreo::rest_router {

std::optional<HttpMethod> ToRouterMethod(wpi::net::http_method wpinet_method);

std::optional<std::string> ExtractPathFromUrl(wpi::net::http_method wpinet_method,
                                              std::string_view url);

std::optional<Request> BuildRequestFromWpinet(wpi::net::http_method wpinet_method,
                                              std::string_view url,
                                              HeaderMap headers,
                                              std::string body);

Response MakeJsonErrorResponse(int status, std::string_view code,
                               std::string_view message);

}  // namespace choreo::rest_router
