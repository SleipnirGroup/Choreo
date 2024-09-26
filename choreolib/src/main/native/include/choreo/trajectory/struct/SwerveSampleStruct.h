// Copyright (c) Choreo contributors

#pragma once

#include <wpi/SymbolExports.h>
#include <wpi/struct/Struct.h>

#include "choreo/trajectory/SwerveSample.h"

template <>
struct wpi::Struct<choreo::SwerveSample> {
  static constexpr std::string_view GetTypeString() { return "SwerveSample"; }
  static constexpr size_t GetSize() { return 144; }
  static constexpr std::string_view GetSchema() {
    return "double timestamp;double x;double y;double heading;double vx;double "
           "vy;double omega;double ax;double ay;double alpha;double "
           "moduleForcesX[4];double moduleForcesY[4];";
  }

  static choreo::SwerveSample Unpack(std::span<const uint8_t> data);
  static void Pack(std::span<uint8_t> data, const choreo::SwerveSample& value);
};

static_assert(wpi::StructSerializable<choreo::SwerveSample>);
