// Copyright (c) Choreo contributors

#pragma once

#include <wpi/SymbolExports.h>
#include <wpi/struct/Struct.h>

#include "choreo/trajectory/DiffySample.h"

template <>
struct wpi::Struct<choreo::trajectory::DiffySample> {
  static constexpr std::string_view GetTypeName() { return "DiffySample"; }
  static constexpr size_t GetSize() { return 80; }
  static constexpr std::string_view GetSchema() {
    return "double timestamp;double x;double y;double heading;double vl;double "
           "vr;double al;double ar;double fl;double fr;";
  }

  static choreo::trajectory::DiffySample Unpack(std::span<const uint8_t> data);
  static void Pack(std::span<uint8_t> data,
                   const choreo::trajectory::DiffySample& value);
};

static_assert(wpi::StructSerializable<choreo::trajectory::DiffySample>);
