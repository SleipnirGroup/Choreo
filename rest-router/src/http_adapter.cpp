#include "choreo/rest_router/http_adapter.hpp"

#include <wpi/net/UrlParser.hpp>
#include <wpi/util/json.hpp>

namespace choreo::rest_router {

std::optional<HttpMethod> ToRouterMethod(wpi::net::http_method wpinet_method) {
  switch (wpinet_method) {
    case wpi::net::HTTP_GET:
      return HttpMethod::kGet;
    case wpi::net::HTTP_POST:
      return HttpMethod::kPost;
    case wpi::net::HTTP_PUT:
      return HttpMethod::kPut;
    case wpi::net::HTTP_PATCH:
      return HttpMethod::kPatch;
    case wpi::net::HTTP_DELETE:
      return HttpMethod::kDelete;
    default:
      return std::nullopt;
  }
}

std::optional<std::string> ExtractPathFromUrl(wpi::net::http_method wpinet_method,
                                              std::string_view url) {
  wpi::net::UrlParser parser{url, wpinet_method == wpi::net::HTTP_CONNECT};
  if (!parser.IsValid()) {
    return std::nullopt;
  }

  if (!parser.HasPath()) {
    return std::string{"/"};
  }

  return std::string{parser.GetPath()};
}

std::optional<Request> BuildRequestFromWpinet(wpi::net::http_method wpinet_method,
                                              std::string_view url,
                                              HeaderMap headers,
                                              std::string body) {
  auto method = ToRouterMethod(wpinet_method);
  if (!method.has_value()) {
    return std::nullopt;
  }

  auto path = ExtractPathFromUrl(wpinet_method, url);
  if (!path.has_value()) {
    return std::nullopt;
  }

  Request request;
  request.method = *method;
  request.path = std::move(*path);
  request.headers = std::move(headers);
  request.body = std::move(body);
  return request;
}

Response MakeJsonErrorResponse(int status, std::string_view code,
                               std::string_view message) {
  wpi::util::json body;
  body["code"] = code;
  body["message"] = message;

  Response response;
  response.status = status;
  response.content_type = "application/json";
  response.body = body.to_string();
  return response;
}

}  // namespace choreo::rest_router
