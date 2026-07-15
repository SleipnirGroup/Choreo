#pragma once

#include <memory>
#include <string>

#include <wpi/net/HttpServerConnection.hpp>

#include "choreo/rest_router/router.hpp"

namespace choreo::rest_router {

class HttpRouterConnection : public wpi::net::HttpServerConnection {
 public:
  HttpRouterConnection(std::shared_ptr<wpi::net::uv::Stream> stream,
                       const Router& router);

 protected:
  void ProcessRequest() override;

 private:
  static std::string StatusText(int status);
  static std::string BuildExtraHeaders(const HeaderMap& headers);

  void ResetCapturedRequest();

  const Router& m_router;
  HeaderMap m_headers;
  std::string m_body;
};

}  // namespace choreo::rest_router
