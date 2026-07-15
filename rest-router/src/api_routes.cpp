#include "choreo/rest_router/api_routes.hpp"

#include <string_view>

#include <wpi/util/json.hpp>

namespace choreo::rest_router {

namespace {

Response JsonResponse(int status, std::string_view message,
                      std::string_view endpoint) {
  wpi::util::json body;
  body["code"] = "not_implemented";
  body["message"] = message;
  body["endpoint"] = endpoint;

  Response response;
  response.status = status;
  response.content_type = "application/json";
  response.body = body.to_string();
  return response;
}

void RegisterNotImplemented(Router& router, HttpMethod method,
                            std::string_view pattern) {
  std::string owned_pattern{pattern};
  std::string owned_endpoint{pattern};
  router.Register(
      method, std::move(owned_pattern),
      [endpoint = std::move(owned_endpoint)](const Request&, const RouteParams&) {
        return JsonResponse(501, "Route scaffolded but not implemented", endpoint);
      });
}

}  // namespace

void RegisterApiV1Routes(Router& router) {
  RegisterNotImplemented(router, HttpMethod::kGet, "/api/v1/health");

  RegisterNotImplemented(router, HttpMethod::kGet, "/api/v1/project");
  RegisterNotImplemented(router, HttpMethod::kPut, "/api/v1/project");
  RegisterNotImplemented(router, HttpMethod::kPatch, "/api/v1/project");

  RegisterNotImplemented(router, HttpMethod::kGet, "/api/v1/trajectories");
  RegisterNotImplemented(router, HttpMethod::kPost, "/api/v1/trajectories");
  RegisterNotImplemented(router, HttpMethod::kGet, "/api/v1/trajectories/{uuid}");
  RegisterNotImplemented(router, HttpMethod::kPut, "/api/v1/trajectories/{uuid}");
  RegisterNotImplemented(router, HttpMethod::kPatch,
                         "/api/v1/trajectories/{uuid}");
  RegisterNotImplemented(router, HttpMethod::kDelete,
                         "/api/v1/trajectories/{uuid}");
  RegisterNotImplemented(router, HttpMethod::kPost,
                         "/api/v1/trajectories/{uuid}/rename");

  RegisterNotImplemented(router, HttpMethod::kPost,
                         "/api/v1/trajectories/{uuid}/waypoints");
  RegisterNotImplemented(router, HttpMethod::kPatch,
                         "/api/v1/trajectories/{uuid}/waypoints/{waypointUuid}");
  RegisterNotImplemented(router, HttpMethod::kDelete,
                         "/api/v1/trajectories/{uuid}/waypoints/{waypointUuid}");
  RegisterNotImplemented(router, HttpMethod::kPost,
                         "/api/v1/trajectories/{uuid}/waypoints/reorder");

  RegisterNotImplemented(router, HttpMethod::kPost,
                         "/api/v1/trajectories/{uuid}/constraints");
  RegisterNotImplemented(
      router, HttpMethod::kPatch,
      "/api/v1/trajectories/{uuid}/constraints/{constraintUuid}");
  RegisterNotImplemented(
      router, HttpMethod::kDelete,
      "/api/v1/trajectories/{uuid}/constraints/{constraintUuid}");
  RegisterNotImplemented(router, HttpMethod::kPost,
                         "/api/v1/trajectories/{uuid}/constraints/reorder");

  RegisterNotImplemented(router, HttpMethod::kPost,
                         "/api/v1/trajectories/{uuid}/markers");
  RegisterNotImplemented(router, HttpMethod::kPatch,
                         "/api/v1/trajectories/{uuid}/markers/{markerUuid}");
  RegisterNotImplemented(router, HttpMethod::kDelete,
                         "/api/v1/trajectories/{uuid}/markers/{markerUuid}");
  RegisterNotImplemented(router, HttpMethod::kPost,
                         "/api/v1/trajectories/{uuid}/markers/reorder");

  RegisterNotImplemented(router, HttpMethod::kPost,
                         "/api/v1/trajectories/{uuid}/generate");
  RegisterNotImplemented(router, HttpMethod::kGet,
                         "/api/v1/trajectories/{uuid}/generation-state");
  RegisterNotImplemented(router, HttpMethod::kPost,
                         "/api/v1/trajectories/{uuid}/generate/cancel-all");

  RegisterNotImplemented(router, HttpMethod::kGet,
                         "/api/v1/operations/{operationId}");
  RegisterNotImplemented(router, HttpMethod::kPost,
                         "/api/v1/operations/{operationId}/cancel");

  RegisterNotImplemented(router, HttpMethod::kGet, "/api/v1/diagnostics");
  RegisterNotImplemented(router, HttpMethod::kGet, "/api/v1/export");
  RegisterNotImplemented(router, HttpMethod::kPost, "/api/v1/import");
}

}  // namespace choreo::rest_router
