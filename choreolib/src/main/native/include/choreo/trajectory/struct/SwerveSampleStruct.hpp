// Copyright (c) Choreo contributors

#pragma once

#include "choreo/trajectory/SwerveSample.hpp"
#include <wpi/util/SymbolExports.hpp>
#include <wpi/util/struct/Struct.hpp>

template <>
struct wpi::util::Struct<choreo::SwerveSample> {
  static constexpr std::string_view GetTypeName() { return "SwerveSample"; }
  static constexpr size_t GetSize() { return 144; }
  static constexpr std::string_view GetSchema() {
    return "double timestamp;double x;double y;double heading;double vx;double "
           "vy;double omega;double ax;double ay;double alpha;double "
           "moduleForcesX[4];double moduleForcesY[4];";
  }

  static choreo::SwerveSample Unpack(std::span<const uint8_t> data);
  static void Pack(std::span<uint8_t> data, const choreo::SwerveSample& value);
};

static_assert(wpi::util::StructSerializable<choreo::SwerveSample>);
