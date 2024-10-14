// Copyright (c) Choreo contributors

#pragma once

#include <string>
#include <string_view>
#include <unordered_map>
#include <utility>

#include <frc2/command/CommandPtr.h>

namespace choreo {

/**
 * A class used to bind commands to events in all trajectories created by an
 * AutoFactory.
 */
class AutoBindings {
 public:
  AutoBindings() = default;
  AutoBindings(const AutoBindings&) = delete;
  AutoBindings& operator=(const AutoBindings&) = delete;

  /**
   * The default move constructor
   */
  AutoBindings(AutoBindings&&) = default;

  /**
   * The default move assignment operator
   *
   * @return the moved autobindings
   */
  AutoBindings& operator=(AutoBindings&&) = default;

  /**
   * Binds a command to an event in all trajectories created by the owener of
   * the bindings.
   *
   * @param name The name of the event to bind the command to
   * @param cmd A function that returns a CommandPtr that you want to bind.
   * @return a reference to itself because we need to keep track of our moved
   * binds (and function chaining)
   */
  AutoBindings& Bind(std::string_view name,
                     std::function<frc2::CommandPtr()> cmd) & {
    bindings.emplace(name, cmd);
    return *this;
  }

  /**
   * Gets a read-only reference to the underlying map of events -> Commands
   *
   * @return the underlying map of event names to command factories
   */
  const std::unordered_map<std::string, std::function<frc2::CommandPtr()>>&
  GetBindings() const {
    return bindings;
  }

 private:
  void Merge(AutoBindings&& other) {
    for (auto& [key, value] : other.bindings) {
      bindings.emplace(key, value);
    }
    other.bindings.clear();
  }

  std::unordered_map<std::string, std::function<frc2::CommandPtr()>> bindings;
};
}  // namespace choreo
