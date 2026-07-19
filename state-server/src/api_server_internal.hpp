#pragma once

#include <cctype>
#include <chrono>
#include <ctime>
#include <format>
#include <functional>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

#include <wpi/util/json.hpp>

#include "choreo/rest_router/http_adapter.hpp"

namespace choreo::state_server::detail {

using choreo::rest_router::HeaderMap;
using choreo::rest_router::Request;
using choreo::rest_router::Response;

inline std::string ToLower(std::string_view text) {
  std::string out;
  out.reserve(text.size());
  for (char c : text) {
    out.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(c))));
  }
  return out;
}

inline std::optional<std::string> GetHeaderCaseInsensitive(
    const HeaderMap& headers, std::string_view key) {
  const auto key_lc = ToLower(key);
  for (const auto& [name, value] : headers) {
    if (ToLower(name) == key_lc) {
      return value;
    }
  }
  return std::nullopt;
}

inline std::string QuotedEtag(std::string_view token) {
  return std::format("\"{}\"", token);
}

inline std::string NowIso8601Utc() {
  const auto now = std::chrono::system_clock::now();
  const auto tt = std::chrono::system_clock::to_time_t(now);
  std::tm tm{};
#ifdef _WIN32
  gmtime_s(&tm, &tt);
#else
  gmtime_r(&tt, &tm);
#endif
  char buf[32]{};
  std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tm);
  return std::string(buf);
}

inline Response PreconditionRequired() {
  return choreo::rest_router::MakeJsonErrorResponse(
      428, "precondition_required",
      "Missing If-Match header for mutation request");
}

inline Response BadRoute(std::string_view message) {
  return choreo::rest_router::MakeJsonErrorResponse(400, "bad_route", message);
}

inline Response NotFound(std::string_view message) {
  return choreo::rest_router::MakeJsonErrorResponse(404, "not_found", message);
}

inline Response ErrorResponse(int status, std::string_view code,
                              std::string_view message) {
  return choreo::rest_router::MakeJsonErrorResponse(status, code, message);
}

inline Response InvalidJson(std::string_view message) {
  return ErrorResponse(400, "invalid_json", message);
}

inline Response InvalidPatch(std::string_view message) {
  return ErrorResponse(400, "invalid_patch", message);
}

inline Response InvalidOrder(std::string_view message) {
  return ErrorResponse(400, "invalid_order", message);
}

inline Response Conflict(std::string_view code, std::string_view message) {
  return ErrorResponse(409, code, message);
}

inline Response ConflictStale(std::string_view current_revision) {
  auto response = choreo::rest_router::MakeJsonErrorResponse(
      409, "stale_revision", "If-Match did not match current resource revision");
  response.headers["ETag"] = QuotedEtag(current_revision);
  return response;
}

inline bool MatchesIfMatchHeader(const Request& request,
                                 std::string_view expected_token) {
  const auto if_match = GetHeaderCaseInsensitive(request.headers, "if-match");
  if (!if_match.has_value()) {
    return false;
  }

  const std::string expected_quoted = QuotedEtag(expected_token);
  return *if_match == expected_quoted || *if_match == expected_token ||
         *if_match == "*";
}

inline std::optional<Response> ValidateIfMatchPrecondition(
    const Request& request, std::string_view current_revision) {
  if (!GetHeaderCaseInsensitive(request.headers, "if-match")) {
    return PreconditionRequired();
  }
  if (!MatchesIfMatchHeader(request, current_revision)) {
    return ConflictStale(current_revision);
  }
  return std::nullopt;
}

inline Response JsonResponse(int status, const wpi::util::json& body) {
  Response response;
  response.status = status;
  response.content_type = "application/json";
  response.body = body.to_string();
  return response;
}

template <typename T>
inline Response JsonModelResponse(int status, const T& value) {
  return JsonResponse(status, wpi::util::json(value));
}

template <typename T>
inline Response JsonModelResponseWithEtag(int status, std::string_view token,
                                          const T& value) {
  auto response = JsonModelResponse(status, value);
  response.headers["ETag"] = QuotedEtag(token);
  return response;
}

inline Response EmptyResponse(int status) {
  Response response;
  response.status = status;
  response.content_type = "application/json";
  response.body = "";
  return response;
}

template <typename T>
inline std::optional<size_t> FindByUuid(const std::vector<T>& items,
                                        std::string_view uuid) {
  for (size_t i = 0; i < items.size(); ++i) {
    if (items[i].uuid == uuid) {
      return i;
    }
  }
  return std::nullopt;
}

inline std::optional<std::reference_wrapper<const std::string>> FindRouteParam(
    const choreo::rest_router::RouteParams& params, std::string_view key) {
  const auto it = params.find(std::string(key));
  if (it == params.end()) {
    return std::nullopt;
  }
  return std::cref(it->second);
}

template <typename Map>
inline auto FindMappedValue(Map& map, const typename Map::key_type& key)
    -> std::optional<std::reference_wrapper<typename Map::mapped_type>> {
  const auto it = map.find(key);
  if (it == map.end()) {
    return std::nullopt;
  }
  return std::ref(it->second);
}

template <typename T>
inline std::optional<std::reference_wrapper<T>> FindByUuidPtr(
    std::vector<T>& items, std::string_view uuid) {
  const auto index = FindByUuid(items, uuid);
  if (!index.has_value()) {
    return std::nullopt;
  }
  return std::ref(items[*index]);
}

template <typename T>
inline std::optional<std::reference_wrapper<const T>> FindByUuidPtr(
    const std::vector<T>& items, std::string_view uuid) {
  const auto index = FindByUuid(items, uuid);
  if (!index.has_value()) {
    return std::nullopt;
  }
  return std::cref(items[*index]);
}

inline bool ParseInsertIndex(const wpi::util::json& body, size_t max_size,
                             size_t& out_index, std::string& error) {
  out_index = max_size;
  if (!body.contains("insertIndex") || body.at("insertIndex").is_null()) {
    return true;
  }

  if (!body.at("insertIndex").is_number()) {
    error = "insertIndex must be a non-negative integer";
    return false;
  }

  const double value = body.at("insertIndex").get_number();
  if (value < 0.0) {
    error = "insertIndex must be a non-negative integer";
    return false;
  }

  const auto as_size = static_cast<size_t>(value);
  if (static_cast<double>(as_size) != value) {
    error = "insertIndex must be a non-negative integer";
    return false;
  }

  if (as_size > max_size) {
    error = "insertIndex out of range";
    return false;
  }

  out_index = as_size;
  return true;
}

inline bool ParseOrderArray(const wpi::util::json& body,
                            std::vector<std::string>& out_order,
                            std::string& error) {
  if (!body.is_object() || !body.contains("order") ||
      !body.at("order").is_array()) {
    error = "Request body must include array field 'order'";
    return false;
  }

  out_order.clear();
  for (const auto& entry : body.at("order").get_array()) {
    if (!entry.is_string()) {
      error = "order entries must be UUID strings";
      return false;
    }
    out_order.emplace_back(entry.get_string());
  }
  return true;
}

inline std::vector<std::string> SplitJsonPointer(std::string_view pointer) {
  std::vector<std::string> tokens;
  if (pointer.empty()) {
    return tokens;
  }
  if (!pointer.starts_with('/')) {
    return {};
  }

  size_t start = 1;
  while (start <= pointer.size()) {
    const size_t slash = pointer.find('/', start);
    const size_t end = slash == std::string_view::npos ? pointer.size() : slash;
    std::string token;
    token.reserve(end - start);
    for (size_t i = start; i < end; ++i) {
      if (pointer[i] == '~' && i + 1 < end) {
        if (pointer[i + 1] == '0') {
          token.push_back('~');
          ++i;
          continue;
        }
        if (pointer[i + 1] == '1') {
          token.push_back('/');
          ++i;
          continue;
        }
      }
      token.push_back(pointer[i]);
    }
    tokens.push_back(std::move(token));
    if (slash == std::string_view::npos) {
      break;
    }
    start = slash + 1;
  }
  return tokens;
}

inline bool ApplyObjectJsonPatch(wpi::util::json& target,
                                 const wpi::util::json& patch,
                                 std::string& error) {
  if (patch.is_object()) {
    for (const auto& [key, value] : patch.get_object()) {
      target[key] = value;
    }
    return true;
  }

  if (!patch.is_array()) {
    error = "PATCH body must be a JSON object or RFC6902 patch array";
    return false;
  }

  for (const auto& op_json : patch.get_array()) {
    if (!op_json.is_object() || !op_json.contains("op") ||
        !op_json.at("op").is_string() || !op_json.contains("path") ||
        !op_json.at("path").is_string()) {
      error = "Each patch operation must include string fields op and path";
      return false;
    }

    const std::string op = op_json.at("op").get_string();
    const std::string path = op_json.at("path").get_string();
    const auto tokens = SplitJsonPointer(path);
    if (path.empty() || tokens.empty()) {
      error = "Only non-root JSON Pointer paths are supported";
      return false;
    }

    wpi::util::json* current = &target;
    for (size_t i = 0; i + 1 < tokens.size(); ++i) {
      if (!current->is_object()) {
        error = "Patch path traverses non-object node";
        return false;
      }
      if (!current->contains(tokens[i])) {
        error = "Patch path does not exist";
        return false;
      }
      current = &(*current)[tokens[i]];
    }

    const std::string& leaf = tokens.back();
    if (!current->is_object()) {
      error = "Patch target parent is not an object";
      return false;
    }

    if (op == "remove") {
      if (!current->contains(leaf)) {
        error = "remove target does not exist";
        return false;
      }
      current->erase(leaf);
      continue;
    }

    if ((op == "add" || op == "replace") && op_json.contains("value")) {
      (*current)[leaf] = op_json.at("value");
      continue;
    }

    error = "Unsupported patch operation (supported: add, replace, remove)";
    return false;
  }

  return true;
}

}  // namespace choreo::state_server::detail
