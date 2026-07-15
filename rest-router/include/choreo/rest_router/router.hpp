#pragma once

#include <functional>
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>
#include <vector>

namespace choreo::rest_router {

enum class HttpMethod {
  kGet,
  kPost,
  kPut,
  kPatch,
  kDelete,
};

using HeaderMap = std::unordered_map<std::string, std::string>;
using RouteParams = std::unordered_map<std::string, std::string>;

struct Request {
  HttpMethod method;
  std::string path;
  HeaderMap headers;
  std::string body;
};

struct Response {
  int status = 200;
  std::string content_type = "application/json";
  HeaderMap headers;
  std::string body;
};

using Handler = std::function<Response(const Request&, const RouteParams&)>;

class Router {
 public:
  void Register(HttpMethod method, std::string pattern, Handler handler);
  std::optional<Response> Dispatch(const Request& request) const;

 private:
  struct Route {
    HttpMethod method;
    std::vector<std::string> segments;
    Handler handler;
  };

  static std::vector<std::string> SplitSegments(std::string_view path);
  static std::optional<RouteParams> Match(const Route& route,
                                          std::string_view path);

  std::vector<Route> m_routes;
};

}  // namespace choreo::rest_router
