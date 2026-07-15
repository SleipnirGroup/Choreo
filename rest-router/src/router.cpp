#include "choreo/rest_router/router.hpp"

namespace choreo::rest_router {

namespace {

bool IsParamSegment(std::string_view segment) {
  return segment.size() >= 2 && segment.front() == '{' && segment.back() == '}';
}

std::string ParamName(std::string_view segment) {
  return std::string(segment.substr(1, segment.size() - 2));
}

}  // namespace

void Router::Register(HttpMethod method, std::string pattern, Handler handler) {
  m_routes.push_back(Route{
      .method = method,
      .segments = SplitSegments(pattern),
      .handler = std::move(handler),
  });
}

std::optional<Response> Router::Dispatch(const Request& request) const {
  for (const auto& route : m_routes) {
    if (route.method != request.method) {
      continue;
    }

    auto params = Match(route, request.path);
    if (!params.has_value()) {
      continue;
    }

    return route.handler(request, *params);
  }

  return std::nullopt;
}

std::vector<std::string> Router::SplitSegments(std::string_view path) {
  std::vector<std::string> segments;
  size_t start = 0;

  while (start < path.size()) {
    while (start < path.size() && path[start] == '/') {
      ++start;
    }
    if (start >= path.size()) {
      break;
    }

    size_t end = start;
    while (end < path.size() && path[end] != '/') {
      ++end;
    }

    segments.emplace_back(path.substr(start, end - start));
    start = end;
  }

  return segments;
}

std::optional<RouteParams> Router::Match(const Route& route,
                                         std::string_view path) {
  const auto request_segments = SplitSegments(path);
  if (request_segments.size() != route.segments.size()) {
    return std::nullopt;
  }

  RouteParams params;

  // Exact match for literal segments, capture values for template params.
  for (size_t i = 0; i < route.segments.size(); ++i) {
    const auto& pattern_segment = route.segments[i];
    const auto& request_segment = request_segments[i];

    if (IsParamSegment(pattern_segment)) {
      params[ParamName(pattern_segment)] = request_segment;
      continue;
    }

    if (pattern_segment != request_segment) {
      return std::nullopt;
    }
  }

  return params;
}

}  // namespace choreo::rest_router
