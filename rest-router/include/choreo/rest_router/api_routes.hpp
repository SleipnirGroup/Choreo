#pragma once

#include "choreo/rest_router/router.hpp"

namespace choreo::rest_router {

// Registers the current API surface with placeholder handlers.
void RegisterApiV1Routes(Router& router);

}  // namespace choreo::rest_router
