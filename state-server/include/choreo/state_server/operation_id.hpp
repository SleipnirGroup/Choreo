#pragma once

#include <cstdint>

#include <wpi/util/json.hpp>

namespace choreo::state_server {

    
static std::atomic<uint64_t> next_id{0};
using OperationId = uint64_t;
inline OperationId generateNextOperationId() {
    return next_id.fetch_add(1);
}
// JSON serialization functions for OperationId
inline void to_json(wpi::util::json& json, const OperationId& id) {
  json = static_cast<int64_t>(id);
}

inline void from_json(const wpi::util::json& json, OperationId& id) {
  id = static_cast<uint64_t>(json.get_int());
}

}  // namespace choreo::state_server

