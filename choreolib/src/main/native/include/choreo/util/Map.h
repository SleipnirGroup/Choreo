// Copyright (c) Choreo contributors

#pragma once

#include <algorithm>
#include <array>
#include <stdexcept>
#include <utility>

namespace choreo::util {

/// A compile-time associative container.
///
/// @tparam Key The key type.
/// @tparam Value The value type.
/// @tparam Size The number of elements in the container.
template <typename Key, typename Value, size_t Size>
class Map {
 public:
  /// Construct the map from an array of key-value pairs.
  ///
  /// @param data The key-value pairs.
  explicit constexpr Map(const std::array<std::pair<Key, Value>, Size>& data)
      : data{data} {}

  /// Returns the value associated with the given key.
  ///
  /// @param key The key.
  /// @return The value.
  /// @throws std::range_error if the key wasn't found.
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
