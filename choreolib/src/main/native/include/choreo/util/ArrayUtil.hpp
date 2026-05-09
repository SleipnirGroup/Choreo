
#include <string>

#include "wpi/util/json.hpp"

namespace choreo::util {
  <template T>
  std::vector<T> ParseObjectArray(const wpi::util::json& json) {
    std::vector<T> result;
    for (const auto&& element : json) {
      result.push_back(element.get<T>());
    }
    return result;
  }

  std::vector<int> ParseIntArray(const wpi::util::json& json) {
    std::vector<int> result;
    for (const auto&& element : json) {
      result.push_back(element.get_int());
    }
    return result;
  }
}