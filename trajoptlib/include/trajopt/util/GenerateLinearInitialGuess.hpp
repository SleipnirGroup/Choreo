// Copyright (c) TrajoptLib contributors

#pragma once

#include <vector>

#include "trajopt/geometry/Pose2.hpp"
#include "trajopt/util/TrajoptUtil.hpp"

namespace trajopt {

// TODO: Replace with std::vector.append_range() from C++23
template <typename T>
inline void append_vector(std::vector<T>& base,
                          const std::vector<T>& newItems) {
  base.insert(base.end(), newItems.begin(), newItems.end());
}

template <typename Solution>
inline Solution GenerateLinearInitialGuess(
    const std::vector<std::vector<Pose2d>>& initialGuessPoints,
    const std::vector<size_t> controlIntervalCounts) {
  size_t wptCnt = controlIntervalCounts.size() + 1;
  size_t sampTot = GetIndex(controlIntervalCounts, wptCnt, 0);

  Solution initialGuess;

  initialGuess.x.reserve(sampTot);
  initialGuess.y.reserve(sampTot);
  initialGuess.thetacos.reserve(sampTot);
  initialGuess.thetasin.reserve(sampTot);
  initialGuess.dt.reserve(sampTot);

  initialGuess.x.push_back(initialGuessPoints.front().front().X());
  initialGuess.y.push_back(initialGuessPoints.front().front().Y());
  initialGuess.thetacos.push_back(
      initialGuessPoints.front().front().Rotation().Cos());
  initialGuess.thetasin.push_back(
      initialGuessPoints.front().front().Rotation().Sin());

  for (size_t i = 0; i < sampTot; ++i) {
    initialGuess.dt.push_back((wptCnt * 5.0) / sampTot);
  }

  for (size_t wptIndex = 1; wptIndex < wptCnt; ++wptIndex) {
    size_t N_sgmt = controlIntervalCounts.at(wptIndex - 1);
    size_t guessPointCount = initialGuessPoints.at(wptIndex).size();
    size_t N_guessSgmt = N_sgmt / guessPointCount;
    append_vector(
        initialGuess.x,
        Linspace(initialGuessPoints.at(wptIndex - 1).back().X(),
                 initialGuessPoints.at(wptIndex).front().X(), N_guessSgmt));
    append_vector(
        initialGuess.y,
        Linspace(initialGuessPoints.at(wptIndex - 1).back().Y(),
                 initialGuessPoints.at(wptIndex).front().Y(), N_guessSgmt));
    auto wptThetas = AngleLinspace(
        initialGuessPoints.at(wptIndex - 1).back().Rotation().Radians(),
        initialGuessPoints.at(wptIndex).front().Rotation().Radians(),
        N_guessSgmt);
    for (auto theta : wptThetas) {
      initialGuess.thetacos.push_back(std::cos(theta));
      initialGuess.thetasin.push_back(std::sin(theta));
    }
    for (size_t guessPointIndex = 1; guessPointIndex < guessPointCount - 1;
         ++guessPointIndex) {  // if three or more guess points
      append_vector(
          initialGuess.x,
          Linspace(initialGuessPoints.at(wptIndex).at(guessPointIndex - 1).X(),
                   initialGuessPoints.at(wptIndex).at(guessPointIndex).X(),
                   N_guessSgmt));
      append_vector(
          initialGuess.y,
          Linspace(initialGuessPoints.at(wptIndex).at(guessPointIndex - 1).Y(),
                   initialGuessPoints.at(wptIndex).at(guessPointIndex).Y(),
                   N_guessSgmt));
      auto guessThetas = AngleLinspace(initialGuessPoints.at(wptIndex)
                                           .at(guessPointIndex - 1)
                                           .Rotation()
                                           .Radians(),
                                       initialGuessPoints.at(wptIndex)
                                           .at(guessPointIndex)
                                           .Rotation()
                                           .Radians(),
                                       N_guessSgmt);
      for (auto theta : guessThetas) {
        initialGuess.thetacos.push_back(std::cos(theta));
        initialGuess.thetasin.push_back(std::sin(theta));
      }
    }
    if (guessPointCount > 1) {  // if two or more guess points
      size_t N_lastGuessSgmt = N_sgmt - (guessPointCount - 1) * N_guessSgmt;
      append_vector(
          initialGuess.x,
          Linspace(initialGuessPoints.at(wptIndex).at(guessPointCount - 2).X(),
                   initialGuessPoints.at(wptIndex).back().X(),
                   N_lastGuessSgmt));
      append_vector(
          initialGuess.y,
          Linspace(initialGuessPoints.at(wptIndex).at(guessPointCount - 2).Y(),
                   initialGuessPoints.at(wptIndex).back().Y(),
                   N_lastGuessSgmt));
      auto lastThetas = AngleLinspace(
          initialGuessPoints.at(wptIndex)
              .at(guessPointCount - 2)
              .Rotation()
              .Radians(),
          initialGuessPoints.at(wptIndex).back().Rotation().Radians(),
          N_lastGuessSgmt);
      for (auto theta : lastThetas) {
        initialGuess.thetacos.push_back(std::cos(theta));
        initialGuess.thetasin.push_back(std::sin(theta));
      }
    }
  }

  return initialGuess;
}

}  // namespace trajopt
