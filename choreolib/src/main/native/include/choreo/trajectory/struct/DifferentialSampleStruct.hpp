// Copyright (c) Choreo contributors

#pragma once

#include <wpi/SymbolExports.h>
#include <wpi/struct/Struct.h>

#include "choreo/trajectory/DifferentialSample.hpp"

template <>
struct wpi::Struct<choreo::DifferentialSample> {
  static constexpr std::string_view GetTypeName() {
    return "DifferentialSample";
  }
  static constexpr size_t GetSize() { return 96; }
  static constexpr std::string_view GetSchema() {
    return "double timestamp;double x;double y;double heading;double vl;double "
           "vr;double omega;double al;double ar;double alpha;double fl;double "
           "fr;";
  }

  static choreo::DifferentialSample Unpack(std::span<const uint8_t> data);
  static void Pack(std::span<uint8_t> data,
                   const choreo::DifferentialSample& value);
};

static_assert(wpi::StructSerializable<choreo::DifferentialSample>);
