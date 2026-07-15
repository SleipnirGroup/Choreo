#include "choreo/rest_router/http_server_connection.hpp"

#include <utility>

#include "choreo/rest_router/http_adapter.hpp"

namespace choreo::rest_router {

HttpRouterConnection::HttpRouterConnection(
    std::shared_ptr<wpi::net::uv::Stream> stream, const Router& router)
    : HttpServerConnection{std::move(stream)}, m_router(router) {
  m_request.header.connect([this](std::string_view name, std::string_view value) {
    m_headers[std::string(name)] = std::string(value);
  });

  m_request.body.connect([this](std::string_view data, bool) {
    m_body.append(data);
  });

  // Base class invokes ProcessRequest() from messageComplete; this runs after
  // dispatch to clear capture buffers for the next keep-alive request.
  m_request.messageComplete.connect([this](bool) { ResetCapturedRequest(); });
}

void HttpRouterConnection::ProcessRequest() {
  const auto method = ToRouterMethod(m_request.GetMethod());
  if (!method.has_value()) {
    SendError(501, "Unsupported HTTP method");
    return;
  }

  auto request = BuildRequestFromWpinet(m_request.GetMethod(), m_request.GetUrl(),
                                        std::move(m_headers), std::move(m_body));
  if (!request.has_value()) {
    SendError(400, "Invalid request URL");
    return;
  }

  auto response = m_router.Dispatch(*request);
  if (!response.has_value()) {
    SendError(404, "Route not found");
    return;
  }

  SendResponse(response->status, StatusText(response->status),
               response->content_type, response->body,
               BuildExtraHeaders(response->headers));
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
