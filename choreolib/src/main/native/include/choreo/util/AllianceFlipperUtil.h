// Copyright (c) Choreo contributors

#pragma once

#include <numbers>

#include <units/angle.h>
#include <units/length.h>

#include "choreo/util/FieldDimensions.h"

namespace choreo::util {

class Flipper {
 public:
  enum class Kind { MirroredX, MirroredY, RotatedAround };

  constexpr Flipper(Kind kind, units::meter_t fieldLength,
                    units::meter_t fieldWidth)
      : m_kind(kind), m_fieldLength(fieldLength), m_fieldWidth(fieldWidth) {}

  static constexpr Flipper MirroredX(units::meter_t fieldLength,
                                     units::meter_t fieldWidth) {
    return Flipper(Kind::MirroredX, fieldLength, fieldWidth);
  }

  static constexpr Flipper MirroredY(units::meter_t fieldLength,
                                     units::meter_t fieldWidth) {
    return Flipper(Kind::MirroredY, fieldLength, fieldWidth);
  }

  static constexpr Flipper RotatedAround(units::meter_t fieldLength,
                                         units::meter_t fieldWidth) {
    return Flipper(Kind::RotatedAround, fieldLength, fieldWidth);
  }

  static constexpr Flipper FRC_CURRENT() {
    return RotatedAround(fieldLength, fieldWidth);
  }

  constexpr units::meter_t GetFieldLength() const { return m_fieldLength; }
  constexpr units::meter_t GetFieldWidth() const { return m_fieldWidth; }
  constexpr Kind GetKind() const { return m_kind; }

  constexpr bool IsMirroredX() const { return m_kind == Kind::MirroredX; }
  constexpr bool IsMirroredY() const { return m_kind == Kind::MirroredY; }
  constexpr bool IsRotatedAround() const {
    return m_kind == Kind::RotatedAround;
  }

  constexpr units::meter_t FlipX(units::meter_t x) const {
    if (IsMirroredY()) {
      return x;
    }
    return m_fieldLength - x;
  }

  constexpr units::meter_t FlipY(units::meter_t y) const {
    if (IsMirroredX()) {
      return y;
    }
    return m_fieldWidth - y;
  }

  constexpr units::radian_t FlipHeading(units::radian_t heading) const {
    if (IsMirroredY()) {
      return -heading;
    }
    if (IsRotatedAround()) {
      return units::radian_t{std::numbers::pi} + heading;
    }
    return units::radian_t{std::numbers::pi} - heading;
  }

 private:
  Kind m_kind;
  units::meter_t m_fieldLength;
  units::meter_t m_fieldWidth;
};

inline Flipper activeAllianceFlip = Flipper::FRC_CURRENT();
inline Flipper activeMirrorY =
    Flipper::MirroredY(activeAllianceFlip.GetFieldLength(),
                       activeAllianceFlip.GetFieldWidth());
inline Flipper activeMirrorX =
    Flipper::MirroredX(activeAllianceFlip.GetFieldLength(),
                       activeAllianceFlip.GetFieldWidth());

inline const Flipper& GetFlipper() { return activeAllianceFlip; }

inline const Flipper& GetMirrorX() { return activeMirrorX; }

inline const Flipper& GetMirrorY() { return activeMirrorY; }

inline void SetFlipper(const Flipper& flipper) {
  activeAllianceFlip = flipper;
  activeMirrorY =
      Flipper::MirroredY(flipper.GetFieldLength(), flipper.GetFieldWidth());
  activeMirrorX =
      Flipper::MirroredX(flipper.GetFieldLength(), flipper.GetFieldWidth());
}

}  // namespace choreo::util
