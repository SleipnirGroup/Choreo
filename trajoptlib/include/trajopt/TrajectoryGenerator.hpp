// Copyright (c) TrajoptLib contributors

#pragma once

#include <vector>

#include <sleipnir/autodiff/Variable.hpp>

#include "util/SymbolExports.hpp"

namespace trajopt {
class TRAJOPT_DLLEXPORT TrajectoryGenerator {
 protected:
  inline std::vector<double> RowSolutionValue(
      std::vector<sleipnir::Variable>& rowVector) {
    std::vector<double> valueRowVector;
    valueRowVector.reserve(rowVector.size());
    for (auto& expression : rowVector) {
      valueRowVector.push_back(expression.Value());
    }
    return valueRowVector;
  }

  inline std::vector<std::vector<double>> MatrixSolutionValue(
      std::vector<std::vector<sleipnir::Variable>>& matrix) {
    std::vector<std::vector<double>> valueMatrix;
    valueMatrix.reserve(matrix.size());
    for (auto& row : matrix) {
      valueMatrix.push_back(RowSolutionValue(row));
    }
    return valueMatrix;
  }
};
}  // namespace trajopt
