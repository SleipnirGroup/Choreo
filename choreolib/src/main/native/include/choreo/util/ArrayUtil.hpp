
#include <string>

#include "wpi/util/json.hpp"

namespace choreo::util {
  template <wpi::util::detail::HasFromJson T>
  std::vector<T> ParseObjectArray(const wpi::util::json& json) {
    std::vector<T> result;
    for (auto&& element : json.get_array()) {
      result.push_back(element.get<T>());
    }
    return result;
  }

  template <wpi::util::detail::HasJsonDeserializer T>
  std::vector<T> ParseObjectArray(const wpi::util::json& json) {
    std::vector<T> result;
    for (auto&& element : json.get_array()) {
      result.push_back(element.get<T>());
    }
    return result;
  }

  std::vector<int> ParseIntArray(const wpi::util::json& json) {
    std::vector<int> result;
    for (auto&& element : json.get_array()) {
      result.push_back(element.get_int());
    }
    return result;
  }
}