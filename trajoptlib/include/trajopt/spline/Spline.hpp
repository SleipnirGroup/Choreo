#pragma once

#include <Eigen/Splines>

#include "trajopt/util/SymbolExports.hpp"

namespace trajopt {
class TRAJOPT_DLLEXPORT Spline {
 
 
 protected:
    Eigen::Spline2d xySpline;
    Eigen::Spline<double, 1> heading;    
};
} // namespace trajopt