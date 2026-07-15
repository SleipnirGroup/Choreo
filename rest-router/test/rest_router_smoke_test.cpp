#include <cassert>
#include <string>

#include <wpi/net/HttpParser.hpp>

#include "choreo/rest_router/api_routes.hpp"
#include "choreo/rest_router/http_adapter.hpp"
#include "choreo/rest_router/router.hpp"

namespace {

using choreo::rest_router::BuildRequestFromWpinet;
using choreo::rest_router::HttpMethod;
using choreo::rest_router::RegisterApiV1Routes;
using choreo::rest_router::Request;
using choreo::rest_router::Response;
using choreo::rest_router::Router;

void TestPathParameterMatching() {
  Router router;
  router.Register(
      HttpMethod::kGet, "/api/v1/trajectories/{uuid}",
      [](const Request&, const choreo::rest_router::RouteParams& params) {
        Response response;
        response.status = 200;
        response.content_type = "text/plain";
        response.body = params.at("uuid");
        return response;
      });

  Request request{.method = HttpMethod::kGet,
                  .path = "/api/v1/trajectories/abc-123",
                  .headers = {},
                  .body = ""};
  auto response = router.Dispatch(request);
  assert(response.has_value());
  assert(response->status == 200);
  assert(response->body == "abc-123");
}

void TestUnmatchedRoute() {
  Router router;
  router.Register(HttpMethod::kGet, "/api/v1/project",
                  [](const Request&, const choreo::rest_router::RouteParams&) {
                    return Response{};
                  });

  Request request{.method = HttpMethod::kGet,
                  .path = "/api/v1/unknown",
                  .headers = {},
                  .body = ""};
  auto response = router.Dispatch(request);
  assert(!response.has_value());
}

void TestApiRouteScaffoldResponse() {
  Router router;
  RegisterApiV1Routes(router);

  Request request{.method = HttpMethod::kGet,
                  .path = "/api/v1/health",
                  .headers = {},
                  .body = ""};

  auto response = router.Dispatch(request);
  assert(response.has_value());
  assert(response->status == 501);
}

void TestWpinetAdapter() {
  auto request = BuildRequestFromWpinet(wpi::net::HTTP_PATCH,
                                        "http://127.0.0.1:8080/api/v1/project",
                                        {}, "[]");

  assert(request.has_value());
  assert(request->method == HttpMethod::kPatch);
  assert(request->path == "/api/v1/project");
}

}  // namespace

int main() {
  TestPathParameterMatching();
  TestUnmatchedRoute();
  TestApiRouteScaffoldResponse();
  TestWpinetAdapter();
  return 0;
}
