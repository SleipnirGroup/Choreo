// Copyright (c) TrajoptLib contributors

#pragma once

#include <array>
#include <concepts>
#include <cstddef>
#include <tuple>
#include <utility>

namespace wpi {

struct empty_array_t {};
constexpr empty_array_t empty_array;

/**
 * This class is a wrapper around std::array that does compile time size
 * checking.
 *
 * std::array's implicit constructor can result in uninitialized elements if the
 * number of arguments doesn't match the std::array size.
 */
template <typename T, size_t N>
class array : public std::array<T, N> {
 public:
  /**
   * Constructs an uninitialized array.
   */
  constexpr explicit array(empty_array_t) {}

  /**
   * Constructs an array initialized with the given elements.
   *
   * @param arg The first element.
   * @param args The remaining elements.
   */
  template <std::convertible_to<T>... Ts>
    requires(1 + sizeof...(Ts) == N)
  constexpr array(T arg, Ts&&... args)  // NOLINT
      : std::array<T, N>{std::forward<T>(arg), std::forward<Ts>(args)...} {}

  /**
   * Copy constructor.
   */
  constexpr array(const array<T, N>&) = default;

  /**
   * Copy assignment operator.
   *
   * @return The left-hand side.
   */
  constexpr array& operator=(const array<T, N>&) = default;

  /**
   * Move constructor.
   */
  constexpr array(array<T, N>&&) = default;

  /**
   * Move assignment operator.
   *
   * @return The left-hand side.
   */
  constexpr array& operator=(array<T, N>&&) = default;

  /**
   * Copy constructor for std::array.
   *
   * @param rhs The std::array to copy.
   */
  constexpr array(const std::array<T, N>& rhs) {  // NOLINT
    *static_cast<std::array<T, N>*>(this) = rhs;
  }

  /**
   * Copy assignment operator for std::array.
   *
   * @param rhs The std::array to copy.
   * @return The left-hand side.
   */
  constexpr array& operator=(const std::array<T, N>& rhs) {
    *static_cast<std::array<T, N>*>(this) = rhs;
    return *this;
  }

  /**
   * Move constructor for std::array.
   *
   * @param rhs The std::array to move.
   */
  constexpr array(std::array<T, N>&& rhs) {  // NOLINT
    *static_cast<std::array<T, N>*>(this) = rhs;
  }

  /**
   * Move assignment operator for std::array.
   *
   * @param rhs The std::array to move.
   * @return The left-hand side.
   */
  constexpr array& operator=(std::array<T, N>&& rhs) {
    *static_cast<std::array<T, N>*>(this) = rhs;
    return *this;
  }
};

template <typename T, std::convertible_to<T>... Ts>
array(T, Ts...) -> array<T, 1 + sizeof...(Ts)>;

}  // namespace wpi

template <size_t I, typename T, size_t N>
  requires(I < N)
constexpr T& get(wpi::array<T, N>& arr) noexcept {
  return std::get<I>(static_cast<std::array<T, N>>(arr));
}

template <size_t I, typename T, size_t N>
  requires(I < N)
constexpr T&& get(wpi::array<T, N>&& arr) noexcept {
  return std::move(std::get<I>(arr));
}

template <size_t I, typename T, size_t N>
  requires(I < N)
constexpr const T& get(const wpi::array<T, N>& arr) noexcept {
  return std::get<I>(static_cast<std::array<T, N>>(arr));
}

template <size_t I, typename T, size_t N>
  requires(I < N)
constexpr const T&& get(const wpi::array<T, N>&& arr) noexcept {
  return std::move(std::get<I>(arr));
}

// Enables structured bindings
namespace std {  // NOLINT
/**
 * Partial specialization of tuple_size for wpi::array.
 */
template <typename T, size_t N>
struct tuple_size<wpi::array<T, N>> : public integral_constant<size_t, N> {};

/**
 * Partial specialization of tuple_element for wpi::array.
 */
template <size_t I, typename T, size_t N>
  requires(I < N)
struct tuple_element<I, wpi::array<T, N>> {
  /// Type trait.
  using type = T;
};
}  // namespace std
