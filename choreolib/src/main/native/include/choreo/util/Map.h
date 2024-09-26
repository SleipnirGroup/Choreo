// Copyright (c) Choreo contributors

#pragma once

#include <algorithm>
#include <array>
#include <stdexcept>
#include <utility>

namespace choreo::util {

template <typename Key, typename Value, size_t Size>
class Map {
 public:
  explicit constexpr Map(const std::array<std::pair<Key, Value>, Size>& data)
      : data{data} {}

  [[nodiscard]]
  constexpr const Value& at(const Key& key) const {
    if (const auto it =
            std::find_if(std::begin(data), std::end(data),
                         [&key](const auto& v) { return v.first == key; });
        it != std::end(data)) {
      return it->second;
    } else {
      throw std::range_error("Key not found");
    }
  }

 private:
  std::array<std::pair<Key, Value>, Size> data;
};

template <typename Key, typename Value, size_t Size>
Map(const std::array<std::pair<Key, Value>, Size>&) -> Map<Key, Value, Size>;

}  // namespace choreo::util
