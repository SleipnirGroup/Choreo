#include "choreo/rest_router/http_server_connection.hpp"

#include <iostream>
#include <utility>

#include "choreo/rest_router/http_adapter.hpp"

namespace choreo::rest_router {

namespace {

std::string_view MethodToString(HttpMethod method) {
  switch (method) {
    case HttpMethod::kGet:
      return "GET";
    case HttpMethod::kPost:
      return "POST";
    case HttpMethod::kPut:
      return "PUT";
    case HttpMethod::kPatch:
      return "PATCH";
    case HttpMethod::kDelete:
      return "DELETE";
  }
  return "UNKNOWN";
}

void LogResponse(std::string_view method, std::string_view path, int status,
                 std::string_view note) {
  std::cout << "rest-router response: " << method << " " << path << " -> "
            << status;
  if (!note.empty()) {
    std::cout << " (" << note << ")";
  }
  std::cout << "\n";
}

}  // namespace

HttpRouterConnection::HttpRouterConnection(
    std::shared_ptr<wpi::net::uv::Stream> stream, const Router& router)
    : HttpServerConnection{std::move(stream)}, m_router(router) {
  m_request.header.connect([this](std::string_view name, std::string_view value) {
    m_headers[std::string(name)] = std::string(value);
  });

  m_request.body.connect([this](std::string_view data, bool) {
    m_body.append(data);
  });
}

void HttpRouterConnection::ProcessRequest() {
  const auto method = ToRouterMethod(m_request.GetMethod());
  if (!method.has_value()) {
    LogResponse("UNKNOWN", m_request.GetUrl(), 501, "unsupported_method");
    SendError(501, "Unsupported HTTP method");
    ResetCapturedRequest();
    return;
  }

  auto request = BuildRequestFromWpinet(m_request.GetMethod(), m_request.GetUrl(),
                                        std::move(m_headers), std::move(m_body));
  if (!request.has_value()) {
    LogResponse(MethodToString(*method), m_request.GetUrl(), 400,
                "invalid_request_url");
    SendError(400, "Invalid request URL");
    ResetCapturedRequest();
    return;
  }

  auto response = m_router.Dispatch(*request);
  if (!response.has_value()) {
    LogResponse(MethodToString(request->method), request->path, 404,
                "route_not_found");
    SendError(404, "Route not found");
    ResetCapturedRequest();
    return;
  }

  LogResponse(MethodToString(request->method), request->path, response->status,
              "ok");
  SendResponse(response->status, StatusText(response->status),
               response->content_type, response->body,
               BuildExtraHeaders(response->headers));
  ResetCapturedRequest();
}

std::string HttpRouterConnection::StatusText(int status) {
  switch (status) {
    case 200:
      return "OK";
    case 201:
      return "Created";
    case 202:
      return "Accepted";
    case 204:
      return "No Content";
    case 400:
      return "Bad Request";
    case 404:
      return "Not Found";
    case 409:
      return "Conflict";
    case 422:
      return "Unprocessable Entity";
    case 428:
      return "Precondition Required";
    case 500:
      return "Internal Server Error";
    case 501:
      return "Not Implemented";
    default:
      return "OK";
  }
}

std::string HttpRouterConnection::BuildExtraHeaders(const HeaderMap& headers) {
  std::string out;
  for (const auto& [name, value] : headers) {
    out += name;
    out += ": ";
    out += value;
    out += "\r\n";
  }
  return out;
}

void HttpRouterConnection::ResetCapturedRequest() {
  m_headers.clear();
  m_body.clear();
}

}  // namespace choreo::rest_router
