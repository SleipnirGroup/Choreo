// Copyright (c) Choreo contributors

#pragma once

#include <networktables/NetworkTable.h>
#include <networktables/NetworkTableInstance.h>
#include <networktables/StringArrayTopic.h>
#include <networktables/StringTopic.h>

#include <functional>
#include <memory>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

#include <frc/DriverStation.h>
#include <frc/Errors.h>
#include <frc/RobotBase.h>
#include <frc2/command/CommandPtr.h>
#include <frc2/command/Commands.h>

#include "choreo/auto/AutoFactory.h"
#include "networktables/Topic.h"

namespace choreo {

/**
 * An auto chooser that allows for the selection of auto routines at runtime.
 *
 * This chooser takes a lazy loading approach to auto routines, only generating
 * the auto routine when it is selected. This approach has the benefit of not
 * loading all autos on startup, but also not loading the auto during auto start
 * causing a delay.
 *
 * Once the AutoChooser is made you can add auto routines to it using the
 * AddAutoRoutine() function . Unlike Sendable Chooser this chooser has to be
 * updated every cycle by calling the Update function in your Robot periodic
 * function.
 *
 * You can retrieve the auto routine CommandPtr that is currently
 * selected by calling the GetSelectedAutoRoutine() function.
 *
 * @tparam SampleType The type of samples in the trajectory.
 * @tparam Year The field year.
 */
template <choreo::TrajectorySample SampleType, int Year>
class AutoChooser {
 public:
  /**
   * Create a new auto chooser.
   *
   * @param factory The auto factory to use for auto routine generation.
   * @param tableName The name of the network table to use for the chooser,
   * passing in an empty string will put this chooser at the root of the network
   * tables.
   */
  AutoChooser(AutoFactory<SampleType, Year>& factory,
              std::string_view tableName)
      : factory{factory} {
    std::string path =
        nt::NetworkTable::NormalizeKey(tableName, true) + "/AutoChooser";
    std::shared_ptr<nt::NetworkTable> table =
        nt::NetworkTableInstance::GetDefault().GetTable(path);

    selected = table->GetStringTopic("selected").GetEntry(NONE_NAME);
    table->GetStringTopic(".type").Publish().Set("String Chooser");
    table->GetStringTopic("default").Publish().SetDefault(NONE_NAME);
    active = table->GetStringTopic("active").GetEntry(NONE_NAME);

    std::vector<std::string> keys;
    for (const auto& pair : autoRoutines) {
      keys.push_back(pair.first);
    }

    options = table->GetStringArrayTopic("options").GetEntry(keys);
  }

  /**
   * Update the auto chooser.
   *
   * This method should be called every cycle in the Robot periodic function. It
   * will check if the selected auto routine has changed and update the active
   * auto routine.
   */
  void Update() {
    if (frc::DriverStation::IsDisabled() || frc::RobotBase::IsSimulation()) {
      std::string selectedString = selected.Get();
      if (selectedString == lastAutoRoutineName) {
        return;
      }
      if (!autoRoutines.contains(selectedString)) {
        selected.Set(NONE_NAME);
        selectedString = NONE_NAME;
        FRC_ReportError(frc::warn::Warning,
                        "Selected an auto that isn't an option!");
      }
      lastAutoRoutineName = selectedString;
      lastAutoRoutine = autoRoutines[lastAutoRoutineName]();
      active.Set(lastAutoRoutineName);
    }
  }

  /**
   * Add an auto routine to the chooser.
   *
   * An auto routine is a function that takes an AutoFactory and returns a
   * CommandPtr. These functions can be static, a lambda or belong to a local
   * variable.
   *
   * A good paradigm is making an `AutoRoutines` class that has a reference
   * to all your subsystems and has helper methods for auto commands inside it.
   * Then you crate methods inside that class that take an `AutoFactory` and
   * return a `CommandPtr`.
   *
   * @param name The name of the auto routine.
   * @param generator The function that generates the auto routine.
   */
  void AddAutoRoutine(std::string name,
                      std::function<frc2::CommandPtr(
                          const AutoFactory<SampleType, Year>& factory)>
                          generator) {
    autoRoutines[name] = generator;

    std::vector<std::string> keys;
    for (const auto& pair : autoRoutines) {
      keys.push_back(pair.first);
    }

    options.Set(keys);
  }

  /**
   * Choose an auto routine by name.
   *
   * @param choice The name of the auto routine to choose.
   */
  void Choose(std::string_view choice) {
    selected.Set(choice);
    Update();
  }

  /**
   * Get the currently selected auto routine.
   *
   * @return The currently selected auto routine.
   */
  frc2::CommandPtr GetSelectedAutoRoutine() {
    return std::move(lastAutoRoutine);
  }

 private:
  static inline std::string NONE_NAME = "Nothing";
  std::unordered_map<std::string,
                     std::function<frc2::CommandPtr(
                         const AutoFactory<SampleType, Year>& factory)>>
      autoRoutines;

  nt::StringEntry selected;
  nt::StringEntry active;

  nt::StringArrayEntry options;

  AutoFactory<SampleType, Year>& factory;

  std::string lastAutoRoutineName = NONE_NAME;
  frc2::CommandPtr lastAutoRoutine{frc2::cmd::None()};
};
}  // namespace choreo
