#include "choreo/state_server/api_server.hpp"

#include "api_server_internal.hpp"

#include <algorithm>
#include <format>
#include <unordered_set>
#include <utility>

#include <wpi/util/json.hpp>

namespace choreo::state_server {

namespace {

using choreo::rest_router::HttpMethod;
using choreo::rest_router::RouteParams;
using choreo::rest_router::Request;
using choreo::rest_router::Response;
using namespace choreo::state_server::detail;

}  // namespace

void ApiServer::RegisterDocumentRoutes() {
    const auto record_scope_mutation =
      [this](std::string_view scope_key, std::string_view reason,
             const wpi::util::json& before) {
        const auto after = CaptureScopeSnapshot(scope_key);
        if (!after.has_value()) {
          return;
        }

        m_history.Record(MakeHistoryEntryFromSnapshots(
            std::string(scope_key), std::string(reason), before, *after,
            std::chrono::system_clock::now()));
      };

  // Route: Health probe.
  // Preconditions: none.
  // Body: none.
  // Response: 200 with { status, uptimeMs, serverVersion }.
  m_router.Register(HttpMethod::kGet, "/api/v1/health",
                    [this, &record_scope_mutation](const Request&, const RouteParams&) {
                      const auto uptime_ms = std::chrono::duration_cast<std::chrono::milliseconds>(
                          std::chrono::steady_clock::now() - m_started_at)
                                                 .count();

                      wpi::util::json json = wpi::util::json::object();
                      json["status"] = "ok";
                      json["uptimeMs"] = static_cast<double>(uptime_ms);
                      json["serverVersion"] = "0.1.0";

                      return JsonResponse(200, json);
                    });

  // Route: Fetch the authoritative project document.
  // Preconditions: none.
  // Body: none.
  // Response: 200 with full ProjectFile JSON and ETag header.
  m_router.Register(HttpMethod::kGet, "/api/v1/project",
                    [this, &record_scope_mutation](const Request&, const RouteParams&) {
                      return JsonModelResponseWithEtag(
                          200, ProjectRevisionToken(), m_project);
                    });

  // Route: Replace the entire project document.
  // Preconditions: If-Match must match the current project ETag.
  // Body: full ProjectFile JSON.
  // Response: 200 with updated ProjectFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPut, "/api/v1/project",
                    [this, &record_scope_mutation](const Request& request, const RouteParams&) {
                      const auto project_scope = ProjectScopeKey();
                      const auto before =
                          CaptureScopeSnapshot(project_scope).value_or(
                              wpi::util::json(nullptr));
                      const auto current_revision = ProjectRevisionToken();
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        auto parsed = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        auto updated = ProjectFile::fromJson(parsed);
                        EnsureUuid(updated.uuid);
                        m_project = std::move(updated);
                        ++m_project_revision;
                        record_scope_mutation(project_scope, "put_project", before);

                        return JsonModelResponseWithEtag(
                          200, ProjectRevisionToken(), m_project);
                      } catch (const std::exception& ex) {
                        return InvalidJson(ex.what());
                      }
                    });

  // Route: Partially update project fields.
  // Preconditions: If-Match must match the current project ETag.
  // Body: object-merge JSON or RFC6902 patch array over ProjectFile fields.
  // Response: 200 with updated ProjectFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPatch, "/api/v1/project",
                    [this, &record_scope_mutation](const Request& request, const RouteParams&) {
                      const auto project_scope = ProjectScopeKey();
                      const auto before =
                          CaptureScopeSnapshot(project_scope).value_or(
                              wpi::util::json(nullptr));
                      const auto current_revision = ProjectRevisionToken();
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        auto patch = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        auto merged = wpi::util::json(m_project);
                        std::string patch_error;
                        if (!ApplyObjectJsonPatch(merged, patch, patch_error)) {
                          return InvalidPatch(patch_error);
                        }

                        auto updated = ProjectFile::fromJson(merged);
                        EnsureUuid(updated.uuid);
                        m_project = std::move(updated);
                        ++m_project_revision;
                        record_scope_mutation(project_scope, "patch_project", before);

                        return JsonModelResponseWithEtag(
                          200, ProjectRevisionToken(), m_project);
                      } catch (const std::exception& ex) {
                        return InvalidPatch(ex.what());
                      }
                    });

  m_router.Register(HttpMethod::kPost, "/api/v1/project/undo",
                    [this, &record_scope_mutation](const Request& request, const RouteParams&) {
                      const auto project_scope = ProjectScopeKey();
                      const auto current_revision = ProjectRevisionToken();
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      if (auto undo_error = HandleUndo(project_scope)) {
                        return *undo_error;
                      }

                      return JsonModelResponseWithEtag(
                          200, ProjectRevisionToken(), m_project);
                    });

  m_router.Register(HttpMethod::kPost, "/api/v1/project/redo",
                    [this, &record_scope_mutation](const Request& request, const RouteParams&) {
                      const auto project_scope = ProjectScopeKey();
                      const auto current_revision = ProjectRevisionToken();
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      if (auto redo_error = HandleRedo(project_scope)) {
                        return *redo_error;
                      }

                      return JsonModelResponseWithEtag(
                          200, ProjectRevisionToken(), m_project);
                    });

  // Route: List trajectory summaries.
  // Preconditions: none.
  // Body: none.
  // Response: 200 with { items, nextCursor, totalEstimate } summary payload.
  m_router.Register(HttpMethod::kGet, "/api/v1/trajectories",
                    [this, &record_scope_mutation](const Request&, const RouteParams&) {
                      wpi::util::json body = wpi::util::json::object(
                          "items", wpi::util::json::array(), "nextCursor",
                          nullptr, "totalEstimate",
                          static_cast<double>(m_trajectories.size()));

                      for (const auto& [uuid, traj] : m_trajectories) {
                        wpi::util::json summary = wpi::util::json::object();
                        summary["uuid"] = traj.uuid;
                        summary["name"] = traj.name;
                        summary["version"] = traj.version;
                        summary["upToDate"] = !traj.must_be_generated(m_project);
                        summary["hasTrajectoryData"] = traj.trajectory.has_value();
                        summary["updatedAt"] = "";
                        summary["revision"] = TrajectoryRevisionToken(uuid);
                        body["items"].emplace_back(std::move(summary));
                      }

                      return JsonResponse(200, body);
                    });

  // Route: Create a new trajectory resource.
  // Preconditions: trajectory UUID must not already exist.
  // Body: full TrajectoryFile JSON.
  // Response: 201 with created TrajectoryFile JSON, Location, and ETag.
  m_router.Register(HttpMethod::kPost, "/api/v1/trajectories",
                    [this, &record_scope_mutation](const Request& request, const RouteParams&) {
                      try {
                        auto parsed = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        auto created = TrajectoryFile::fromJson(parsed);
                        EnsureUuid(created.uuid);

                        if (m_trajectories.contains(created.uuid)) {
                          return Conflict("uuid_conflict",
                              "Trajectory UUID already exists");
                        }

                        const auto uuid = created.uuid;
                        const auto trajectory_scope = TrajectoryScopeKey(uuid);
                        const auto before =
                            CaptureScopeSnapshot(trajectory_scope).value_or(
                                wpi::util::json(nullptr));
                        m_trajectories.emplace(uuid, std::move(created));
                        ++m_trajectory_revisions[uuid];
                        record_scope_mutation(trajectory_scope, "create_trajectory",
                                              before);

                        auto response = JsonModelResponseWithEtag(
                          201, TrajectoryRevisionToken(uuid),
                          m_trajectories.at(uuid));
                        response.headers["Location"] =
                          std::format("/api/v1/trajectories/{}", uuid);
                        return response;
                      } catch (const std::exception& ex) {
                        return InvalidJson(ex.what());
                      }
                    });

  // Route: Fetch a single trajectory resource.
  // Preconditions: targeted trajectory UUID must exist.
  // Body: none.
  // Response: 200 with full TrajectoryFile JSON and ETag.
  m_router.Register(HttpMethod::kGet, "/api/v1/trajectories/{uuid}",
                    [this, &record_scope_mutation](const Request&, const RouteParams& params) {
                      const auto trajectory_uuid = FindRouteParam(params, "uuid");
                      if (!trajectory_uuid.has_value()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }
                      const auto& trajectory_uuid_value = trajectory_uuid->get();

                      const auto trajectory =
                          FindMappedValue(m_trajectories, trajectory_uuid_value);
                      if (!trajectory.has_value()) {
                        return NotFound("Trajectory not found");
                      }

                      return JsonModelResponseWithEtag(
                          200, TrajectoryRevisionToken(trajectory_uuid_value),
                          trajectory->get());
                    });

  m_router.Register(HttpMethod::kPost, "/api/v1/trajectories/{uuid}/undo",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto trajectory_uuid = FindRouteParam(params, "uuid");
                      if (!trajectory_uuid.has_value()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }
                      const auto& uuid = trajectory_uuid->get();

                      const auto scope_key = TrajectoryScopeKey(uuid);
                      const auto current_revision = TrajectoryRevisionToken(uuid);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      if (auto undo_error = HandleUndo(scope_key)) {
                        return *undo_error;
                      }

                      auto trajectory = FindMappedValue(m_trajectories, uuid);
                      if (!trajectory.has_value()) {
                        auto body = wpi::util::json::object();
                        body["uuid"] = uuid;
                        body["deleted"] = true;
                        auto response = JsonResponse(200, body);
                        response.headers["ETag"] = QuotedEtag(TrajectoryRevisionToken(uuid));
                        return response;
                      }

                      return JsonModelResponseWithEtag(
                          200, TrajectoryRevisionToken(uuid), trajectory->get());
                    });

  m_router.Register(HttpMethod::kPost, "/api/v1/trajectories/{uuid}/redo",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto trajectory_uuid = FindRouteParam(params, "uuid");
                      if (!trajectory_uuid.has_value()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }
                      const auto& uuid = trajectory_uuid->get();

                      const auto scope_key = TrajectoryScopeKey(uuid);
                      const auto current_revision = TrajectoryRevisionToken(uuid);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      if (auto redo_error = HandleRedo(scope_key)) {
                        return *redo_error;
                      }

                      auto trajectory = FindMappedValue(m_trajectories, uuid);
                      if (!trajectory.has_value()) {
                        auto body = wpi::util::json::object();
                        body["uuid"] = uuid;
                        body["deleted"] = true;
                        auto response = JsonResponse(200, body);
                        response.headers["ETag"] = QuotedEtag(TrajectoryRevisionToken(uuid));
                        return response;
                      }

                      return JsonModelResponseWithEtag(
                          200, TrajectoryRevisionToken(uuid), trajectory->get());
                    });

  // Route: Replace the entire trajectory document.
  // Preconditions: trajectory must exist and If-Match must match its ETag.
  // Body: full TrajectoryFile JSON.
  // Response: 200 with updated TrajectoryFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPut, "/api/v1/trajectories/{uuid}",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto trajectory_uuid = FindRouteParam(params, "uuid");
                      if (!trajectory_uuid.has_value()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }
                      const auto& trajectory_uuid_value = trajectory_uuid->get();
                        const auto trajectory_scope =
                          TrajectoryScopeKey(trajectory_uuid_value);
                        const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                            wpi::util::json(nullptr));

                      if (!FindMappedValue(m_trajectories, trajectory_uuid_value)) {
                        return NotFound("Trajectory not found");
                      }

                      const auto current_revision =
                          TrajectoryRevisionToken(trajectory_uuid_value);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        auto parsed = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        auto updated = TrajectoryFile::fromJson(parsed);
                        updated.uuid = trajectory_uuid_value;
                        m_trajectories[trajectory_uuid_value] = std::move(updated);
                        ++m_trajectory_revisions[trajectory_uuid_value];
                        record_scope_mutation(trajectory_scope, "put_trajectory", before);

                        return JsonModelResponseWithEtag(
                          200, TrajectoryRevisionToken(trajectory_uuid_value),
                          m_trajectories.at(trajectory_uuid_value));
                      } catch (const std::exception& ex) {
                        return InvalidJson(ex.what());
                      }
                    });

  // Route: Partially update top-level trajectory fields.
  // Preconditions: trajectory must exist and If-Match must match its ETag.
  // Body: object-merge JSON or RFC6902 patch array over TrajectoryFile fields.
  // Response: 200 with updated TrajectoryFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPatch, "/api/v1/trajectories/{uuid}",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto trajectory_uuid = FindRouteParam(params, "uuid");
                      if (!trajectory_uuid.has_value()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }
                      const auto& trajectory_uuid_value = trajectory_uuid->get();
                        const auto trajectory_scope =
                          TrajectoryScopeKey(trajectory_uuid_value);
                        const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                            wpi::util::json(nullptr));

                      const auto existing =
                          FindMappedValue(m_trajectories, trajectory_uuid_value);
                      if (!existing.has_value()) {
                        return NotFound("Trajectory not found");
                      }
                      const auto& existing_trajectory = existing->get();

                      const auto current_revision =
                          TrajectoryRevisionToken(trajectory_uuid_value);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        auto patch = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        auto merged = wpi::util::json(existing_trajectory);
                        std::string patch_error;
                        if (!ApplyObjectJsonPatch(merged, patch, patch_error)) {
                          return InvalidPatch(patch_error);
                        }

                        auto updated = TrajectoryFile::fromJson(merged);
                        updated.uuid = trajectory_uuid_value;
                        m_trajectories[trajectory_uuid_value] = std::move(updated);
                        ++m_trajectory_revisions[trajectory_uuid_value];
                        record_scope_mutation(trajectory_scope, "patch_trajectory", before);

                        return JsonModelResponseWithEtag(
                          200, TrajectoryRevisionToken(trajectory_uuid_value),
                          m_trajectories.at(trajectory_uuid_value));
                      } catch (const std::exception& ex) {
                        return InvalidPatch(ex.what());
                      }
                    });

  // Route: Rename a trajectory without changing its UUID.
  // Preconditions: trajectory must exist, If-Match must match, and name must be unique and non-empty.
  // Body: { name }.
  // Response: 200 with updated TrajectoryFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPost, "/api/v1/trajectories/{uuid}/rename",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto trajectory_uuid = FindRouteParam(params, "uuid");
                      if (!trajectory_uuid.has_value()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }
                      const auto& trajectory_uuid_value = trajectory_uuid->get();
                        const auto trajectory_scope =
                          TrajectoryScopeKey(trajectory_uuid_value);
                        const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                            wpi::util::json(nullptr));

                      auto trajectory =
                          FindMappedValue(m_trajectories, trajectory_uuid_value);
                      if (!trajectory.has_value()) {
                        return NotFound("Trajectory not found");
                      }
                      auto& trajectory_value = trajectory->get();

                      const auto current_revision =
                          TrajectoryRevisionToken(trajectory_uuid_value);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        auto body = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        if (!body.is_object() || !body.contains("name") ||
                            !body.at("name").is_string()) {
                          return InvalidJson(
                              "Request body must include string field 'name'");
                        }

                        const std::string name = body.at("name").get_string();
                        if (name.empty()) {
                          return ErrorResponse(
                              400, "invalid_name", "Trajectory name must not be empty");
                        }

                        for (const auto& [other_uuid, other] : m_trajectories) {
                          if (other_uuid != trajectory_uuid_value && other.name == name) {
                            return Conflict("name_conflict",
                                "Trajectory name already exists");
                          }
                        }

                        trajectory_value.name = name;
                        ++m_trajectory_revisions[trajectory_uuid_value];
                        record_scope_mutation(trajectory_scope, "rename_trajectory", before);

                        return JsonModelResponseWithEtag(
                            200, TrajectoryRevisionToken(trajectory_uuid_value),
                            trajectory_value);
                      } catch (const std::exception& ex) {
                        return InvalidJson(ex.what());
                      }
                    });

  // Route: Insert a waypoint into a trajectory.
  // Preconditions: trajectory must exist, If-Match must match, and waypoint UUID must be unique.
  // Body: { waypoint, insertIndex? }.
  // Response: 201 with updated TrajectoryFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPost, "/api/v1/trajectories/{uuid}/waypoints",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto it = params.find("uuid");
                      if (it == params.end()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }

                      auto traj_it = m_trajectories.find(it->second);
                      if (traj_it == m_trajectories.end()) {
                        return NotFound("Trajectory not found");
                      }
                      const auto trajectory_scope = TrajectoryScopeKey(it->second);
                      const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                              wpi::util::json(nullptr));

                      const auto current_revision = TrajectoryRevisionToken(it->second);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        auto body = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        if (!body.is_object() || !body.contains("waypoint") ||
                            !body.at("waypoint").is_object()) {
                          return choreo::rest_router::MakeJsonErrorResponse(
                              400, "invalid_json",
                              "Request body must include object field 'waypoint'");
                        }

                        auto waypoint = Waypoint::fromJson(body.at("waypoint"));
                        EnsureUuid(waypoint.uuid);

                        if (FindByUuid(traj_it->second.params.waypoints, waypoint.uuid)) {
                          return choreo::rest_router::MakeJsonErrorResponse(
                              409, "uuid_conflict", "Waypoint UUID already exists");
                        }

                        size_t insert_index = traj_it->second.params.waypoints.size();
                        std::string parse_error;
                        if (!ParseInsertIndex(body, traj_it->second.params.waypoints.size(),
                                              insert_index, parse_error)) {
                          return choreo::rest_router::MakeJsonErrorResponse(
                              400, "invalid_json", parse_error);
                        }

                        auto& waypoints = traj_it->second.params.waypoints;
                        waypoints.insert(waypoints.begin() + insert_index,
                                         std::move(waypoint));
                        ++m_trajectory_revisions[it->second];
                        record_scope_mutation(trajectory_scope, "add_waypoint", before);

                        return JsonModelResponseWithEtag(
                          201, TrajectoryRevisionToken(it->second),
                          traj_it->second);
                      } catch (const std::exception& ex) {
                        return choreo::rest_router::MakeJsonErrorResponse(
                            400, "invalid_json", ex.what());
                      }
                    });

  // Route: Patch a single waypoint.
  // Preconditions: trajectory and waypoint must exist, and If-Match must match the trajectory ETag.
  // Body: object-merge JSON or RFC6902 patch array over Waypoint fields.
  // Response: 200 with updated TrajectoryFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPatch,
                    "/api/v1/trajectories/{uuid}/waypoints/{waypointUuid}",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto traj_param = params.find("uuid");
                      const auto waypoint_param = params.find("waypointUuid");
                      if (traj_param == params.end() || waypoint_param == params.end()) {
                        return BadRoute("Missing route parameter");
                      }

                      auto traj_it = m_trajectories.find(traj_param->second);
                      if (traj_it == m_trajectories.end()) {
                        return NotFound("Trajectory not found");
                      }
                      const auto trajectory_scope =
                          TrajectoryScopeKey(traj_param->second);
                      const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                              wpi::util::json(nullptr));

                      auto waypoint_index =
                          FindByUuid(traj_it->second.params.waypoints,
                                     waypoint_param->second);
                      if (!waypoint_index.has_value()) {
                        return NotFound("Waypoint not found");
                      }

                      const auto current_revision =
                          TrajectoryRevisionToken(traj_param->second);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        auto patch = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        auto merged =
                            wpi::util::json(traj_it->second.params.waypoints[*waypoint_index]);
                        std::string patch_error;
                        if (!ApplyObjectJsonPatch(merged, patch, patch_error)) {
                          return choreo::rest_router::MakeJsonErrorResponse(
                              400, "invalid_patch", patch_error);
                        }

                        auto updated = Waypoint::fromJson(merged);
                        updated.uuid = waypoint_param->second;
                        traj_it->second.params.waypoints[*waypoint_index] =
                            std::move(updated);
                        ++m_trajectory_revisions[traj_param->second];
                        record_scope_mutation(trajectory_scope, "patch_waypoint", before);

                        return JsonModelResponseWithEtag(
                          200, TrajectoryRevisionToken(traj_param->second),
                          traj_it->second);
                      } catch (const std::exception& ex) {
                        return choreo::rest_router::MakeJsonErrorResponse(
                            400, "invalid_patch", ex.what());
                      }
                    });

  // Route: Delete a single waypoint.
  // Preconditions: trajectory and waypoint must exist, If-Match must match, and at least one waypoint must remain.
  // Body: none.
  // Response: 204 with no body after related references are cleaned up.
  m_router.Register(HttpMethod::kDelete,
                    "/api/v1/trajectories/{uuid}/waypoints/{waypointUuid}",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto traj_param = params.find("uuid");
                      const auto waypoint_param = params.find("waypointUuid");
                      if (traj_param == params.end() || waypoint_param == params.end()) {
                        return BadRoute("Missing route parameter");
                      }

                      auto traj_it = m_trajectories.find(traj_param->second);
                      if (traj_it == m_trajectories.end()) {
                        return NotFound("Trajectory not found");
                      }
                      const auto trajectory_scope =
                          TrajectoryScopeKey(traj_param->second);
                      const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                              wpi::util::json(nullptr));

                      auto waypoint_index =
                          FindByUuid(traj_it->second.params.waypoints,
                                     waypoint_param->second);
                      if (!waypoint_index.has_value()) {
                        return NotFound("Waypoint not found");
                      }

                      const auto current_revision =
                          TrajectoryRevisionToken(traj_param->second);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      auto& waypoints = traj_it->second.params.waypoints;
                      if (waypoints.size() <= 1) {
                        return choreo::rest_router::MakeJsonErrorResponse(
                            422, "invalid_operation",
                            "Trajectory must contain at least one waypoint");
                      }
                      waypoints.erase(waypoints.begin() + *waypoint_index);

                      auto& constraints = traj_it->second.params.constraints;
                      constraints.erase(
                          std::remove_if(constraints.begin(), constraints.end(),
                                         [&waypoint_param](const Constraint& constraint) {
                                           const auto matches_id =
                                               [&waypoint_param](const WaypointID& id) {
                                                 if (!std::holds_alternative<WaypointUUID>(id)) {
                                                   return false;
                                                 }
                                                 return std::get<WaypointUUID>(id).uuid ==
                                                        waypoint_param->second;
                                               };
                                           if (matches_id(constraint.from)) {
                                             return true;
                                           }
                                           if (constraint.to && matches_id(*constraint.to)) {
                                             return true;
                                           }
                                           return false;
                                         }),
                          constraints.end());

                      for (auto& marker : traj_it->second.events) {
                        if (!marker.from.target ||
                            !std::holds_alternative<WaypointUUID>(*marker.from.target)) {
                          continue;
                        }
                        if (std::get<WaypointUUID>(*marker.from.target).uuid ==
                            waypoint_param->second) {
                          marker.from.target = std::nullopt;
                          marker.from.targetTimestamp = std::nullopt;
                        }
                      }

                      ++m_trajectory_revisions[traj_param->second];
                      record_scope_mutation(trajectory_scope, "delete_waypoint", before);
                      return EmptyResponse(204);
                    });

  // Route: Reorder all waypoints in a trajectory.
  // Preconditions: trajectory must exist and If-Match must match its ETag.
  // Body: { order: [waypointUuid, ...] } including every waypoint exactly once.
  // Response: 200 with updated TrajectoryFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPost,
                    "/api/v1/trajectories/{uuid}/waypoints/reorder",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto traj_param = params.find("uuid");
                      if (traj_param == params.end()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }

                      auto traj_it = m_trajectories.find(traj_param->second);
                      if (traj_it == m_trajectories.end()) {
                        return NotFound("Trajectory not found");
                      }
                      const auto trajectory_scope =
                          TrajectoryScopeKey(traj_param->second);
                      const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                              wpi::util::json(nullptr));

                      const auto current_revision =
                          TrajectoryRevisionToken(traj_param->second);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        auto body = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        std::vector<std::string> order;
                        std::string parse_error;
                        if (!ParseOrderArray(body, order, parse_error)) {
                          return choreo::rest_router::MakeJsonErrorResponse(
                              400, "invalid_json", parse_error);
                        }

                        const auto& waypoints = traj_it->second.params.waypoints;
                        if (order.size() != waypoints.size()) {
                          return choreo::rest_router::MakeJsonErrorResponse(
                              400, "invalid_order",
                              "order must include every waypoint UUID exactly once");
                        }

                        std::unordered_set<std::string> seen;
                        std::vector<Waypoint> reordered;
                        reordered.reserve(waypoints.size());
                        for (const auto& uuid : order) {
                          if (!seen.emplace(uuid).second) {
                            return choreo::rest_router::MakeJsonErrorResponse(
                                400, "invalid_order",
                                "order contains duplicate waypoint UUID");
                          }
                          const auto index = FindByUuid(waypoints, uuid);
                          if (!index.has_value()) {
                            return choreo::rest_router::MakeJsonErrorResponse(
                                400, "invalid_order",
                                "order contains unknown waypoint UUID");
                          }
                          reordered.emplace_back(waypoints[*index]);
                        }

                        traj_it->second.params.waypoints = std::move(reordered);
                        ++m_trajectory_revisions[traj_param->second];
                        record_scope_mutation(trajectory_scope, "reorder_waypoints",
                                              before);

                        return JsonModelResponseWithEtag(
                          200, TrajectoryRevisionToken(traj_param->second),
                          traj_it->second);
                      } catch (const std::exception& ex) {
                        return choreo::rest_router::MakeJsonErrorResponse(
                            400, "invalid_json", ex.what());
                      }
                    });

  // Route: Insert a constraint into a trajectory.
  // Preconditions: trajectory must exist, If-Match must match, and constraint UUID must be unique.
  // Body: { constraint, insertIndex? }.
  // Response: 201 with updated TrajectoryFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPost,
                    "/api/v1/trajectories/{uuid}/constraints",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto traj_param = params.find("uuid");
                      if (traj_param == params.end()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }

                      auto traj_it = m_trajectories.find(traj_param->second);
                      if (traj_it == m_trajectories.end()) {
                        return NotFound("Trajectory not found");
                      }
                      const auto trajectory_scope =
                          TrajectoryScopeKey(traj_param->second);
                      const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                              wpi::util::json(nullptr));

                      const auto current_revision =
                          TrajectoryRevisionToken(traj_param->second);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        auto body = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        if (!body.is_object() || !body.contains("constraint") ||
                            !body.at("constraint").is_object()) {
                          return choreo::rest_router::MakeJsonErrorResponse(
                              400, "invalid_json",
                              "Request body must include object field 'constraint'");
                        }

                        auto constraint = Constraint::fromJson(body.at("constraint"));
                        EnsureUuid(constraint.uuid);

                        if (FindByUuid(traj_it->second.params.constraints,
                                       constraint.uuid)) {
                          return choreo::rest_router::MakeJsonErrorResponse(
                              409, "uuid_conflict",
                              "Constraint UUID already exists");
                        }

                        size_t insert_index = traj_it->second.params.constraints.size();
                        std::string parse_error;
                        if (!ParseInsertIndex(body,
                                              traj_it->second.params.constraints.size(),
                                              insert_index, parse_error)) {
                          return choreo::rest_router::MakeJsonErrorResponse(
                              400, "invalid_json", parse_error);
                        }

                        auto& constraints = traj_it->second.params.constraints;
                        constraints.insert(constraints.begin() + insert_index,
                                           std::move(constraint));
                        ++m_trajectory_revisions[traj_param->second];
                        record_scope_mutation(trajectory_scope, "add_constraint", before);

                        return JsonModelResponseWithEtag(
                          201, TrajectoryRevisionToken(traj_param->second),
                          traj_it->second);
                      } catch (const std::exception& ex) {
                        return choreo::rest_router::MakeJsonErrorResponse(
                            400, "invalid_json", ex.what());
                      }
                    });

  // Route: Patch a single constraint.
  // Preconditions: trajectory and constraint must exist, and If-Match must match the trajectory ETag.
  // Body: object-merge JSON or RFC6902 patch array over Constraint fields.
  // Response: 200 with updated TrajectoryFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPatch,
                    "/api/v1/trajectories/{uuid}/constraints/{constraintUuid}",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto traj_param = params.find("uuid");
                      const auto constraint_param = params.find("constraintUuid");
                      if (traj_param == params.end() ||
                          constraint_param == params.end()) {
                        return BadRoute("Missing route parameter");
                      }

                      auto traj_it = m_trajectories.find(traj_param->second);
                      if (traj_it == m_trajectories.end()) {
                        return NotFound("Trajectory not found");
                      }
                      const auto trajectory_scope =
                          TrajectoryScopeKey(traj_param->second);
                      const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                              wpi::util::json(nullptr));

                      auto constraint_index =
                          FindByUuid(traj_it->second.params.constraints,
                                     constraint_param->second);
                      if (!constraint_index.has_value()) {
                        return NotFound("Constraint not found");
                      }

                      const auto current_revision =
                          TrajectoryRevisionToken(traj_param->second);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        auto patch = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        auto merged = wpi::util::json(
                            traj_it->second.params.constraints[*constraint_index]);
                        std::string patch_error;
                        if (!ApplyObjectJsonPatch(merged, patch, patch_error)) {
                          return choreo::rest_router::MakeJsonErrorResponse(
                              400, "invalid_patch", patch_error);
                        }

                        auto updated = Constraint::fromJson(merged);
                        updated.uuid = constraint_param->second;
                        traj_it->second.params.constraints[*constraint_index] =
                            std::move(updated);
                        ++m_trajectory_revisions[traj_param->second];
                        record_scope_mutation(trajectory_scope, "patch_constraint",
                                    before);

                        return JsonModelResponseWithEtag(
                          200, TrajectoryRevisionToken(traj_param->second),
                          traj_it->second);
                      } catch (const std::exception& ex) {
                        return choreo::rest_router::MakeJsonErrorResponse(
                            400, "invalid_patch", ex.what());
                      }
                    });

  // Route: Delete a single constraint.
  // Preconditions: trajectory and constraint must exist, and If-Match must match the trajectory ETag.
  // Body: none.
  // Response: 204 with no body.
  m_router.Register(HttpMethod::kDelete,
                    "/api/v1/trajectories/{uuid}/constraints/{constraintUuid}",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto traj_param = params.find("uuid");
                      const auto constraint_param = params.find("constraintUuid");
                      if (traj_param == params.end() ||
                          constraint_param == params.end()) {
                        return BadRoute("Missing route parameter");
                      }

                      auto traj_it = m_trajectories.find(traj_param->second);
                      if (traj_it == m_trajectories.end()) {
                        return NotFound("Trajectory not found");
                      }
                      const auto trajectory_scope =
                          TrajectoryScopeKey(traj_param->second);
                      const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                              wpi::util::json(nullptr));

                      auto constraint_index =
                          FindByUuid(traj_it->second.params.constraints,
                                     constraint_param->second);
                      if (!constraint_index.has_value()) {
                        return NotFound("Constraint not found");
                      }

                      const auto current_revision =
                          TrajectoryRevisionToken(traj_param->second);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      auto& constraints = traj_it->second.params.constraints;
                      constraints.erase(constraints.begin() + *constraint_index);
                      ++m_trajectory_revisions[traj_param->second];
                      record_scope_mutation(trajectory_scope, "delete_constraint", before);

                      return EmptyResponse(204);
                    });

  // Route: Reorder all constraints in a trajectory.
  // Preconditions: trajectory must exist and If-Match must match its ETag.
  // Body: { order: [constraintUuid, ...] } including every constraint exactly once.
  // Response: 200 with updated TrajectoryFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPost,
                    "/api/v1/trajectories/{uuid}/constraints/reorder",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto traj_param = params.find("uuid");
                      if (traj_param == params.end()) {
                        return choreo::rest_router::MakeJsonErrorResponse(
                            400, "bad_route", "Missing trajectory UUID parameter");
                      }

                      auto traj_it = m_trajectories.find(traj_param->second);
                      if (traj_it == m_trajectories.end()) {
                        return choreo::rest_router::MakeJsonErrorResponse(
                            404, "not_found", "Trajectory not found");
                      }
                        const auto trajectory_scope =
                          TrajectoryScopeKey(traj_param->second);
                        const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                            wpi::util::json(nullptr));

                      const auto current_revision =
                          TrajectoryRevisionToken(traj_param->second);
                      if (!GetHeaderCaseInsensitive(request.headers, "if-match")) {
                        return PreconditionRequired();
                      }
                      if (!MatchesIfMatchHeader(request, current_revision)) {
                        return ConflictStale(current_revision);
                      }

                      try {
                        auto body = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        std::vector<std::string> order;
                        std::string parse_error;
                        if (!ParseOrderArray(body, order, parse_error)) {
                          return ErrorResponse(400, "invalid_json", parse_error);
                        }

                        const auto& constraints = traj_it->second.params.constraints;
                        if (order.size() != constraints.size()) {
                          return ErrorResponse(400, "invalid_order",
                              "order must include every constraint UUID exactly once");
                        }

                        std::unordered_set<std::string> seen;
                        std::vector<Constraint> reordered;
                        reordered.reserve(constraints.size());
                        for (const auto& uuid : order) {
                          if (!seen.emplace(uuid).second) {
                            return ErrorResponse(400, "invalid_order",
                                "order contains duplicate constraint UUID");
                          }
                          const auto index = FindByUuid(constraints, uuid);
                          if (!index.has_value()) {
                            return ErrorResponse(400, "invalid_order",
                                "order contains unknown constraint UUID");
                          }
                          reordered.emplace_back(constraints[*index]);
                        }

                        traj_it->second.params.constraints = std::move(reordered);
                        ++m_trajectory_revisions[traj_param->second];
                        record_scope_mutation(trajectory_scope,
                                    "reorder_constraints", before);
                        return JsonModelResponseWithEtag(
                            200, TrajectoryRevisionToken(traj_param->second),
                            traj_it->second);
                      } catch (const std::exception& ex) {
                        return ErrorResponse(400, "invalid_json", ex.what());
                      }
                    });

  // Route: Insert an event marker into a trajectory.
  // Preconditions: trajectory must exist, If-Match must match, and marker UUID must be unique.
  // Body: { marker, insertIndex? }.
  // Response: 201 with updated TrajectoryFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPost, "/api/v1/trajectories/{uuid}/markers",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto traj_param = params.find("uuid");
                      if (traj_param == params.end()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }

                      auto traj_it = m_trajectories.find(traj_param->second);
                      if (traj_it == m_trajectories.end()) {
                        return NotFound("Trajectory not found");
                      }
                      const auto trajectory_scope =
                          TrajectoryScopeKey(traj_param->second);
                      const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                              wpi::util::json(nullptr));

                      const auto current_revision =
                          TrajectoryRevisionToken(traj_param->second);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        auto body = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        if (!body.is_object() || !body.contains("marker") ||
                            !body.at("marker").is_object()) {
                          return ErrorResponse(400, "invalid_json",
                              "Request body must include object field 'marker'");
                        }

                        auto marker = EventMarker::fromJson(body.at("marker"));
                        EnsureUuid(marker.uuid);

                        if (FindByUuid(traj_it->second.events, marker.uuid)) {
                          return ErrorResponse(409, "uuid_conflict",
                                               "Marker UUID already exists");
                        }

                        size_t insert_index = traj_it->second.events.size();
                        std::string parse_error;
                        if (!ParseInsertIndex(body, traj_it->second.events.size(),
                                              insert_index, parse_error)) {
                          return ErrorResponse(400, "invalid_json", parse_error);
                        }

                        auto& markers = traj_it->second.events;
                        markers.insert(markers.begin() + insert_index,
                                       std::move(marker));
                        ++m_trajectory_revisions[traj_param->second];
                        record_scope_mutation(trajectory_scope, "add_marker", before);
                        return JsonModelResponseWithEtag(
                            201, TrajectoryRevisionToken(traj_param->second),
                            traj_it->second);
                      } catch (const std::exception& ex) {
                        return ErrorResponse(400, "invalid_json", ex.what());
                      }
                    });

  // Route: Patch a single event marker.
  // Preconditions: trajectory and marker must exist, and If-Match must match the trajectory ETag.
  // Body: object-merge JSON or RFC6902 patch array over EventMarker fields.
  // Response: 200 with updated TrajectoryFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPatch,
                    "/api/v1/trajectories/{uuid}/markers/{markerUuid}",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto traj_param = params.find("uuid");
                      const auto marker_param = params.find("markerUuid");
                      if (traj_param == params.end() || marker_param == params.end()) {
                        return BadRoute("Missing route parameter");
                      }

                      auto traj_it = m_trajectories.find(traj_param->second);
                      if (traj_it == m_trajectories.end()) {
                        return NotFound("Trajectory not found");
                      }
                      const auto trajectory_scope =
                          TrajectoryScopeKey(traj_param->second);
                      const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                              wpi::util::json(nullptr));

                      auto marker_index =
                          FindByUuid(traj_it->second.events, marker_param->second);
                      if (!marker_index.has_value()) {
                        return NotFound("Marker not found");
                      }

                      const auto current_revision =
                          TrajectoryRevisionToken(traj_param->second);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        auto patch = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        auto merged =
                            wpi::util::json(traj_it->second.events[*marker_index]);
                        std::string patch_error;
                        if (!ApplyObjectJsonPatch(merged, patch, patch_error)) {
                          return ErrorResponse(400, "invalid_patch", patch_error);
                        }

                        auto updated = EventMarker::fromJson(merged);
                        updated.uuid = marker_param->second;
                        traj_it->second.events[*marker_index] = std::move(updated);
                        ++m_trajectory_revisions[traj_param->second];
                        record_scope_mutation(trajectory_scope, "patch_marker", before);
                        return JsonModelResponseWithEtag(
                            200, TrajectoryRevisionToken(traj_param->second),
                            traj_it->second);
                      } catch (const std::exception& ex) {
                        return ErrorResponse(400, "invalid_patch", ex.what());
                      }
                    });

  // Route: Delete a single event marker.
  // Preconditions: trajectory and marker must exist, and If-Match must match the trajectory ETag.
  // Body: none.
  // Response: 204 with no body.
  m_router.Register(HttpMethod::kDelete,
                    "/api/v1/trajectories/{uuid}/markers/{markerUuid}",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto traj_param = params.find("uuid");
                      const auto marker_param = params.find("markerUuid");
                      if (traj_param == params.end() || marker_param == params.end()) {
                        return BadRoute("Missing route parameter");
                      }

                      auto traj_it = m_trajectories.find(traj_param->second);
                      if (traj_it == m_trajectories.end()) {
                        return NotFound("Trajectory not found");
                      }
                      const auto trajectory_scope =
                          TrajectoryScopeKey(traj_param->second);
                      const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                              wpi::util::json(nullptr));

                      auto marker_index =
                          FindByUuid(traj_it->second.events, marker_param->second);
                      if (!marker_index.has_value()) {
                        return NotFound("Marker not found");
                      }

                      const auto current_revision =
                          TrajectoryRevisionToken(traj_param->second);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      auto& markers = traj_it->second.events;
                      markers.erase(markers.begin() + *marker_index);
                      ++m_trajectory_revisions[traj_param->second];
                      record_scope_mutation(trajectory_scope, "delete_marker", before);
                      return EmptyResponse(204);
                    });

  // Route: Reorder all event markers in a trajectory.
  // Preconditions: trajectory must exist and If-Match must match its ETag.
  // Body: { order: [markerUuid, ...] } including every marker exactly once.
  // Response: 200 with updated TrajectoryFile JSON and a fresh ETag.
  m_router.Register(HttpMethod::kPost,
                    "/api/v1/trajectories/{uuid}/markers/reorder",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto traj_param = params.find("uuid");
                      if (traj_param == params.end()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }

                      auto traj_it = m_trajectories.find(traj_param->second);
                      if (traj_it == m_trajectories.end()) {
                        return NotFound("Trajectory not found");
                      }
                      const auto trajectory_scope =
                          TrajectoryScopeKey(traj_param->second);
                      const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                              wpi::util::json(nullptr));

                      const auto current_revision =
                          TrajectoryRevisionToken(traj_param->second);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      try {
                        auto body = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        std::vector<std::string> order;
                        std::string parse_error;
                        if (!ParseOrderArray(body, order, parse_error)) {
                          return ErrorResponse(400, "invalid_json", parse_error);
                        }

                        const auto& markers = traj_it->second.events;
                        if (order.size() != markers.size()) {
                          return ErrorResponse(400, "invalid_order",
                              "order must include every marker UUID exactly once");
                        }

                        std::unordered_set<std::string> seen;
                        std::vector<EventMarker> reordered;
                        reordered.reserve(markers.size());
                        for (const auto& uuid : order) {
                          if (!seen.emplace(uuid).second) {
                            return ErrorResponse(400, "invalid_order",
                                "order contains duplicate marker UUID");
                          }
                          const auto index = FindByUuid(markers, uuid);
                          if (!index.has_value()) {
                            return ErrorResponse(400, "invalid_order",
                                "order contains unknown marker UUID");
                          }
                          reordered.emplace_back(markers[*index]);
                        }

                        traj_it->second.events = std::move(reordered);
                        ++m_trajectory_revisions[traj_param->second];
                        record_scope_mutation(trajectory_scope, "reorder_markers",
                                    before);
                        return JsonModelResponseWithEtag(
                            200, TrajectoryRevisionToken(traj_param->second),
                            traj_it->second);
                      } catch (const std::exception& ex) {
                        return ErrorResponse(400, "invalid_json", ex.what());
                      }
                    });

  // Route: Export a full in-memory snapshot.
  // Preconditions: none.
  // Body: none.
  // Response: 200 with { schemaVersion, exportedAt, project, trajectories }.
  m_router.Register(HttpMethod::kGet, "/api/v1/export",
                    [this, &record_scope_mutation](const Request&, const RouteParams&) {
                      wpi::util::json body = wpi::util::json::object();
                      body["schemaVersion"] = 1;
                      body["exportedAt"] = "";
                      body["project"] = m_project;
                      body["trajectories"] = wpi::util::json::array();
                      for (const auto& [_, traj] : m_trajectories) {
                        body["trajectories"].emplace_back(traj);
                      }

                      return JsonResponse(200, body);
                    });

  // Route: Import a full project/trajectory snapshot.
  // Preconditions: body mode must be merge or replace and bundle must contain project plus trajectories.
  // Body: { mode, bundle }.
  // Response: 202 with completed operation summary for creates, updates, and deletes.
  m_router.Register(HttpMethod::kPost, "/api/v1/import",
                    [this, &record_scope_mutation](const Request& request, const RouteParams&) {
                      try {
                        auto body = wpi::util::json::parse_or_throw(
                            std::string_view{request.body});
                        if (!body.is_object() || !body.contains("mode") ||
                            !body.at("mode").is_string() ||
                            !body.contains("bundle") ||
                            !body.at("bundle").is_object()) {
                          return ErrorResponse(400, "invalid_json",
                              "Request body must include mode and bundle");
                        }

                        const std::string mode = body.at("mode").get_string();
                        if (mode != "merge" && mode != "replace") {
                          return ErrorResponse(400, "invalid_mode",
                              "mode must be 'merge' or 'replace'");
                        }

                        const auto& bundle = body.at("bundle");
                        if (!bundle.contains("project") ||
                            !bundle.contains("trajectories") ||
                            !bundle.at("trajectories").is_array()) {
                          return ErrorResponse(400, "invalid_json",
                              "bundle must include project and trajectories array");
                        }

                        auto imported_project =
                            ProjectFile::fromJson(bundle.at("project"));
                        EnsureUuid(imported_project.uuid);

                        std::vector<TrajectoryFile> imported_trajectories;
                        imported_trajectories.reserve(
                            bundle.at("trajectories").get_array().size());
                        for (const auto& traj_json : bundle.at("trajectories").get_array()) {
                          auto traj = TrajectoryFile::fromJson(traj_json);
                          EnsureUuid(traj.uuid);
                          imported_trajectories.emplace_back(std::move(traj));
                        }

                        const int original_count =
                            static_cast<int>(m_trajectories.size());

                        m_history.ClearAll();

                        m_project = std::move(imported_project);
                        ++m_project_revision;

                        int creates = 0;
                        int updates = 0;
                        int deletes = 0;
                        if (mode == "replace") {
                          deletes =
                              original_count >
                                      static_cast<int>(imported_trajectories.size())
                                  ? original_count -
                                        static_cast<int>(imported_trajectories.size())
                                  : 0;
                          m_trajectories.clear();
                          m_trajectory_revisions.clear();
                          for (auto& traj : imported_trajectories) {
                            const std::string uuid = traj.uuid;
                            m_trajectories[uuid] = std::move(traj);
                            m_trajectory_revisions[uuid] = 1;
                          }
                          creates = static_cast<int>(m_trajectories.size());
                        } else {
                          for (auto& traj : imported_trajectories) {
                            const std::string uuid = traj.uuid;
                            if (m_trajectories.contains(uuid)) {
                              ++updates;
                              ++m_trajectory_revisions[uuid];
                            } else {
                              ++creates;
                              m_trajectory_revisions[uuid] = 1;
                            }
                            m_trajectories[uuid] = std::move(traj);
                          }
                        }

                        PersistStateSnapshot();


                        // TODO: whatever this is doing, it shouldn't use the operation system like this
                        OperationId operation_id = generateNextOperationId();
                        OperationRecord record("");
                        record.markComplete(ProjectRevisionToken());
                        m_operations.insert_or_assign(operation_id, std::move(record));

                        wpi::util::json response_body = wpi::util::json::object();
                        response_body["operationId"] = operation_id;
                        response_body["state"] = record.state;
                        response_body["summary"] = wpi::util::json::object(
                            "projectAction", mode == "replace" ? "replace" : "merge",
                            "trajectoryCreates", creates,
                            "trajectoryUpdates", updates,
                            "trajectoryDeletes", deletes);

                        return JsonResponse(202, response_body);
                      } catch (const std::exception& ex) {
                        return ErrorResponse(400, "invalid_json", ex.what());
                      }
                    });

  // Route: Delete a trajectory resource.
  // Preconditions: trajectory must exist and If-Match must match its ETag.
  // Body: none.
  // Response: 204 with no body.
  m_router.Register(HttpMethod::kDelete, "/api/v1/trajectories/{uuid}",
                    [this, &record_scope_mutation](const Request& request, const RouteParams& params) {
                      const auto it = params.find("uuid");
                      if (it == params.end()) {
                        return BadRoute("Missing trajectory UUID parameter");
                      }

                      if (!m_trajectories.contains(it->second)) {
                        return NotFound("Trajectory not found");
                      }

                      const auto trajectory_scope = TrajectoryScopeKey(it->second);
                      const auto before =
                          CaptureScopeSnapshot(trajectory_scope).value_or(
                              wpi::util::json(nullptr));

                      const auto current_revision = TrajectoryRevisionToken(it->second);
                      if (auto error =
                              ValidateIfMatchPrecondition(request, current_revision)) {
                        return *error;
                      }

                      m_trajectories.erase(it->second);
                      ++m_trajectory_revisions[it->second];
                      record_scope_mutation(trajectory_scope, "delete_trajectory", before);

                      auto response = EmptyResponse(204);
                      response.headers["ETag"] =
                          QuotedEtag(TrajectoryRevisionToken(it->second));
                      return response;
                    });
}

}  // namespace choreo::state_server