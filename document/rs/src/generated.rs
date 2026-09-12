// This file is generated from document/schema.json. Do not edit manually.

pub const DOCUMENT_SCHEMA_VERSION: u32 = 4;

#[doc = "JSON schema covering every struct/enum in document/cpp that has to_json or from_json defined."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(transparent)]
pub struct ChoreoDocumentSchema(pub ::serde_json::Value);
impl ::std::ops::Deref for ChoreoDocumentSchema {
    type Target = ::serde_json::Value;
    fn deref(&self) -> &::serde_json::Value {
        &self.0
    }
}
impl ::std::convert::From<ChoreoDocumentSchema> for ::serde_json::Value {
    fn from(value: ChoreoDocumentSchema) -> Self {
        value.0
    }
}
impl ::std::convert::From<::serde_json::Value> for ChoreoDocumentSchema {
    fn from(value: ::serde_json::Value) -> Self {
        Self(value)
    }
}
#[doc = "Code generation settings stored in the project file."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct CodeGenConfig {
    #[doc = "Generate data objects with details on each trajectory."]
    #[serde(rename = "genTrajData", default = "defaults::default_bool::<true>")]
    pub gen_traj_data: bool,
    #[doc = "Generate named variable accessors."]
    #[serde(rename = "genVars", default = "defaults::default_bool::<true>")]
    pub gen_vars: bool,
    #[doc = "Output root directory path. Empty string means 'not set'."]
    #[serde(skip_serializing_if = "::std::option::Option::is_none")]
    pub root: ::std::option::Option<::std::string::String>,
    #[doc = "Emit ChoreoLib-compatible API calls."]
    #[serde(rename = "useChoreoLib", default = "defaults::default_bool::<true>")]
    pub use_choreo_lib: bool,
}
impl ::std::default::Default for CodeGenConfig {
    fn default() -> Self {
        Self {
            gen_traj_data: defaults::default_bool::<true>(),
            gen_vars: defaults::default_bool::<true>(),
            root: Default::default(),
            use_choreo_lib: defaults::default_bool::<true>(),
        }
    }
}
#[doc = "Progress event carrying the final generated trajectory file JSON payload."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct CompleteTrajectoryProgressMessage {
    pub event: CompleteTrajectoryProgressMessageEvent,
    pub payload: CompleteTrajectoryProgressMessagePayload,
    pub version: CompleteTrajectoryProgressMessageVersion,
}
#[doc = "`CompleteTrajectoryProgressMessageEvent`"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CompleteTrajectoryProgressMessageEvent {
    #[serde(rename = "completeTrajectory")]
    CompleteTrajectory,
}
impl ::std::fmt::Display for CompleteTrajectoryProgressMessageEvent {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CompleteTrajectory => f.write_str("completeTrajectory"),
        }
    }
}
impl ::std::str::FromStr for CompleteTrajectoryProgressMessageEvent {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "completeTrajectory" => Ok(Self::CompleteTrajectory),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CompleteTrajectoryProgressMessageEvent {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CompleteTrajectoryProgressMessageEvent {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`CompleteTrajectoryProgressMessagePayload`"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct CompleteTrajectoryProgressMessagePayload {
    #[doc = "Serialized TrajectoryFile JSON string."]
    #[serde(rename = "trajectoryFile")]
    pub trajectory_file: ::std::string::String,
}
#[doc = "`CompleteTrajectoryProgressMessageVersion`"]
#[derive(:: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(transparent)]
pub struct CompleteTrajectoryProgressMessageVersion(i64);
impl ::std::ops::Deref for CompleteTrajectoryProgressMessageVersion {
    type Target = i64;
    fn deref(&self) -> &i64 {
        &self.0
    }
}
impl ::std::convert::From<CompleteTrajectoryProgressMessageVersion> for i64 {
    fn from(value: CompleteTrajectoryProgressMessageVersion) -> Self {
        value.0
    }
}
impl ::std::convert::TryFrom<i64> for CompleteTrajectoryProgressMessageVersion {
    type Error = self::error::ConversionError;
    fn try_from(value: i64) -> ::std::result::Result<Self, self::error::ConversionError> {
        if ![1_i64].contains(&value) {
            Err("invalid value".into())
        } else {
            Ok(Self(value))
        }
    }
}
impl<'de> ::serde::Deserialize<'de> for CompleteTrajectoryProgressMessageVersion {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        Self::try_from(<i64>::deserialize(deserializer)?)
            .map_err(|e| <D::Error as ::serde::de::Error>::custom(e.to_string()))
    }
}
#[doc = "A typed constraint applied at or between waypoints."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Constraint {
    pub data: ConstraintVariant,
    pub enabled: bool,
    #[doc = "Waypoint the constraint starts at"]
    pub from: WaypointId,
    #[doc = "Waypoint the constraint ends at (omit for point constraint)"]
    #[serde(skip_serializing_if = "::std::option::Option::is_none")]
    pub to: ::std::option::Option<WaypointId>,
    #[doc = "Stable UUID for this constraint."]
    pub uuid: Uuid,
}
#[doc = "Which samples a constraint applies to."]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ConstraintScope {
    #[serde(rename = "both")]
    Both,
    #[serde(rename = "waypoint")]
    Waypoint,
    #[serde(rename = "segment")]
    Segment,
}
impl ::std::fmt::Display for ConstraintScope {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Both => f.write_str("both"),
            Self::Waypoint => f.write_str("waypoint"),
            Self::Segment => f.write_str("segment"),
        }
    }
}
impl ::std::str::FromStr for ConstraintScope {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "both" => Ok(Self::Both),
            "waypoint" => Ok(Self::Waypoint),
            "segment" => Ok(Self::Segment),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ConstraintScope {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ConstraintScope {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "A typed constraint; discriminated by the 'type' string field."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(untagged)]
pub enum ConstraintVariant {
    MaxVelocity(MaxVelocity),
    MaxAngularVelocity(MaxAngularVelocity),
    KeepInCircle(KeepInCircle),
    HeadingConstraint(HeadingConstraint),
}
impl ::std::convert::From<MaxVelocity> for ConstraintVariant {
    fn from(value: MaxVelocity) -> Self {
        Self::MaxVelocity(value)
    }
}
impl ::std::convert::From<MaxAngularVelocity> for ConstraintVariant {
    fn from(value: MaxAngularVelocity) -> Self {
        Self::MaxAngularVelocity(value)
    }
}
impl ::std::convert::From<KeepInCircle> for ConstraintVariant {
    fn from(value: KeepInCircle) -> Self {
        Self::KeepInCircle(value)
    }
}
impl ::std::convert::From<HeadingConstraint> for ConstraintVariant {
    fn from(value: HeadingConstraint) -> Self {
        Self::HeadingConstraint(value)
    }
}
#[doc = "Progress event carrying diagnostic text."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct DiagnosticProgressMessage {
    pub event: DiagnosticProgressMessageEvent,
    pub payload: DiagnosticProgressMessagePayload,
    pub version: DiagnosticProgressMessageVersion,
}
#[doc = "`DiagnosticProgressMessageEvent`"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum DiagnosticProgressMessageEvent {
    #[serde(rename = "diagnostic")]
    Diagnostic,
}
impl ::std::fmt::Display for DiagnosticProgressMessageEvent {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Diagnostic => f.write_str("diagnostic"),
        }
    }
}
impl ::std::str::FromStr for DiagnosticProgressMessageEvent {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "diagnostic" => Ok(Self::Diagnostic),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for DiagnosticProgressMessageEvent {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for DiagnosticProgressMessageEvent {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`DiagnosticProgressMessagePayload`"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct DiagnosticProgressMessagePayload {
    pub text: ::std::string::String,
}
#[doc = "`DiagnosticProgressMessageVersion`"]
#[derive(:: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(transparent)]
pub struct DiagnosticProgressMessageVersion(i64);
impl ::std::ops::Deref for DiagnosticProgressMessageVersion {
    type Target = i64;
    fn deref(&self) -> &i64 {
        &self.0
    }
}
impl ::std::convert::From<DiagnosticProgressMessageVersion> for i64 {
    fn from(value: DiagnosticProgressMessageVersion) -> Self {
        value.0
    }
}
impl ::std::convert::TryFrom<i64> for DiagnosticProgressMessageVersion {
    type Error = self::error::ConversionError;
    fn try_from(value: i64) -> ::std::result::Result<Self, self::error::ConversionError> {
        if ![1_i64].contains(&value) {
            Err("invalid value".into())
        } else {
            Ok(Self(value))
        }
    }
}
impl<'de> ::serde::Deserialize<'de> for DiagnosticProgressMessageVersion {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        Self::try_from(<i64>::deserialize(deserializer)?)
            .map_err(|e| <D::Error as ::serde::de::Error>::custom(e.to_string()))
    }
}
#[doc = "wpi::math::DifferentialSample serialized as JSON."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct DifferentialSample {
    pub acceleration: WpiChassisAccelerations,
    #[doc = "Left wheel speed (m/s)"]
    #[serde(rename = "leftVelocity")]
    pub left_velocity: f64,
    pub pose: WpiPose2d,
    #[doc = "Right wheel speed (m/s)"]
    #[serde(rename = "rightVelocity")]
    pub right_velocity: f64,
    #[doc = "Sample timestamp relative to trajectory start (s)"]
    pub time: f64,
    pub velocity: WpiChassisVelocities,
}
#[doc = "WPILib DifferentialTrajectory JSON sample container."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct DifferentialSamplesContainer {
    pub samples: ::std::vec::Vec<DifferentialSample>,
}
#[doc = "The drive topology of the robot."]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum DriveType {
    Swerve,
    Differential,
}
impl ::std::fmt::Display for DriveType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Swerve => f.write_str("Swerve"),
            Self::Differential => f.write_str("Differential"),
        }
    }
}
impl ::std::str::FromStr for DriveType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "Swerve" => Ok(Self::Swerve),
            "Differential" => Ok(Self::Differential),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for DriveType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for DriveType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "Progress event carrying an error message."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ErrorProgressMessage {
    pub event: ErrorProgressMessageEvent,
    pub payload: ErrorProgressMessagePayload,
    pub version: ErrorProgressMessageVersion,
}
#[doc = "`ErrorProgressMessageEvent`"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ErrorProgressMessageEvent {
    #[serde(rename = "error")]
    Error,
}
impl ::std::fmt::Display for ErrorProgressMessageEvent {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Error => f.write_str("error"),
        }
    }
}
impl ::std::str::FromStr for ErrorProgressMessageEvent {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "error" => Ok(Self::Error),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ErrorProgressMessageEvent {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ErrorProgressMessageEvent {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`ErrorProgressMessagePayload`"]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ErrorProgressMessagePayload {
    pub message: ::std::string::String,
}
#[doc = "`ErrorProgressMessageVersion`"]
#[derive(:: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(transparent)]
pub struct ErrorProgressMessageVersion(i64);
impl ::std::ops::Deref for ErrorProgressMessageVersion {
    type Target = i64;
    fn deref(&self) -> &i64 {
        &self.0
    }
}
impl ::std::convert::From<ErrorProgressMessageVersion> for i64 {
    fn from(value: ErrorProgressMessageVersion) -> Self {
        value.0
    }
}
impl ::std::convert::TryFrom<i64> for ErrorProgressMessageVersion {
    type Error = self::error::ConversionError;
    fn try_from(value: i64) -> ::std::result::Result<Self, self::error::ConversionError> {
        if ![1_i64].contains(&value) {
            Err("invalid value".into())
        } else {
            Ok(Self(value))
        }
    }
}
impl<'de> ::serde::Deserialize<'de> for ErrorProgressMessageVersion {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        Self::try_from(<i64>::deserialize(deserializer)?)
            .map_err(|e| <D::Error as ::serde::de::Error>::custom(e.to_string()))
    }
}
#[doc = "A named event placed at a time on the trajectory."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct EventMarker {
    pub from: EventMarkerData,
    pub name: ::std::string::String,
    #[doc = "Stable UUID for this event marker."]
    pub uuid: Uuid,
}
#[doc = "Timing information anchoring an event marker to the trajectory."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct EventMarkerData {
    #[doc = "Time offset from the target (s)"]
    pub offset: Expr,
    #[doc = "Target waypoint reference; null if not set."]
    #[serde(deserialize_with = "::std::option::Option::deserialize")]
    pub target: ::std::option::Option<WaypointId>,
    #[doc = "Pre-computed trajectory time at the target waypoint (s); null if not available."]
    #[serde(
        rename = "targetTimestamp",
        deserialize_with = "::std::option::Option::deserialize"
    )]
    pub target_timestamp: ::std::option::Option<f64>,
}
#[doc = "A mathematical expression paired with a pre-evaluated numeric value in SI base units."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Expr {
    #[doc = "MathJS expression string (e.g. '1.5 * kg', '90 deg')"]
    pub exp: ::std::string::String,
    #[doc = "Pre-evaluated SI base-unit value (e.g. metres, radians, kg, s)"]
    pub val: f64,
}
#[doc = "Named scalar/dimensional variable keyed by UUID in variables.expressions."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ExpressionVariableEntry {
    pub dimension: ExpressionVariableEntryDimension,
    pub name: ExpressionVariableEntryName,
    pub var: Expr,
}
#[doc = "`ExpressionVariableEntryDimension`"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ExpressionVariableEntryDimension {
    Number,
    Length,
    LinVel,
    LinAcc,
    Angle,
    AngVel,
    AngAcc,
    Time,
    Mass,
    Torque,
    MoI,
    Current,
    #[serde(rename = "KT")]
    Kt,
    #[serde(rename = "KV")]
    Kv,
}
impl ::std::fmt::Display for ExpressionVariableEntryDimension {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Number => f.write_str("Number"),
            Self::Length => f.write_str("Length"),
            Self::LinVel => f.write_str("LinVel"),
            Self::LinAcc => f.write_str("LinAcc"),
            Self::Angle => f.write_str("Angle"),
            Self::AngVel => f.write_str("AngVel"),
            Self::AngAcc => f.write_str("AngAcc"),
            Self::Time => f.write_str("Time"),
            Self::Mass => f.write_str("Mass"),
            Self::Torque => f.write_str("Torque"),
            Self::MoI => f.write_str("MoI"),
            Self::Current => f.write_str("Current"),
            Self::Kt => f.write_str("KT"),
            Self::Kv => f.write_str("KV"),
        }
    }
}
impl ::std::str::FromStr for ExpressionVariableEntryDimension {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "Number" => Ok(Self::Number),
            "Length" => Ok(Self::Length),
            "LinVel" => Ok(Self::LinVel),
            "LinAcc" => Ok(Self::LinAcc),
            "Angle" => Ok(Self::Angle),
            "AngVel" => Ok(Self::AngVel),
            "AngAcc" => Ok(Self::AngAcc),
            "Time" => Ok(Self::Time),
            "Mass" => Ok(Self::Mass),
            "Torque" => Ok(Self::Torque),
            "MoI" => Ok(Self::MoI),
            "Current" => Ok(Self::Current),
            "KT" => Ok(Self::Kt),
            "KV" => Ok(Self::Kv),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ExpressionVariableEntryDimension {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ExpressionVariableEntryDimension {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`ExpressionVariableEntryName`"]
#[derive(:: serde :: Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct ExpressionVariableEntryName(::std::string::String);
impl ::std::ops::Deref for ExpressionVariableEntryName {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<ExpressionVariableEntryName> for ::std::string::String {
    fn from(value: ExpressionVariableEntryName) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for ExpressionVariableEntryName {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() < 1usize {
            return Err("shorter than 1 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for ExpressionVariableEntryName {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ExpressionVariableEntryName {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for ExpressionVariableEntryName {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
#[doc = "A 2D force vector in newtons (choreo::ForceVector2d / wpi::math::ForceVector2d)."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ForceVector2d {
    #[doc = "X force component (N)"]
    pub x: f64,
    #[doc = "Y force component (N)"]
    pub y: f64,
}
#[doc = "Constraint: robot heading must stay within tolerance of a target angle."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct HeadingConstraint {
    #[doc = "Target heading (rad)"]
    pub heading: Expr,
    #[doc = "Allowed deviation (rad)"]
    pub tolerance: Expr,
    #[serde(rename = "type")]
    pub type_: HeadingConstraintType,
}
#[doc = "`HeadingConstraintType`"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum HeadingConstraintType {
    Heading,
}
impl ::std::fmt::Display for HeadingConstraintType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Heading => f.write_str("Heading"),
        }
    }
}
impl ::std::str::FromStr for HeadingConstraintType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "Heading" => Ok(Self::Heading),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for HeadingConstraintType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for HeadingConstraintType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "wpi::math::HolonomicSample serialized as JSON."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct HolonomicSample {
    pub acceleration: WpiChassisAccelerations,
    pub pose: WpiPose2d,
    #[doc = "Sample timestamp relative to trajectory start (s)"]
    pub time: f64,
    pub velocity: WpiChassisVelocities,
}
#[doc = "WPILib HolonomicTrajectory JSON sample container."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct HolonomicSamplesContainer {
    pub samples: ::std::vec::Vec<HolonomicSample>,
}
#[doc = "Progress event carrying an incomplete trajectory sample update encoded as a WPILib struct-array base64 blob."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct IncompleteTrajectoryProgressMessage {
    #[serde(rename = "driveType")]
    pub drive_type: DriveType,
    pub event: IncompleteTrajectoryProgressMessageEvent,
    #[serde(rename = "sampleCount")]
    pub sample_count: u64,
    #[doc = "WPILib struct size in bytes for one sample."]
    #[serde(rename = "sampleStructSize")]
    pub sample_struct_size: ::std::num::NonZeroU64,
    #[doc = "WPILib struct type string (e.g. struct:HolonomicSample)."]
    #[serde(rename = "sampleStructType")]
    pub sample_struct_type: ::std::string::String,
    #[doc = "Base64-encoded packed WPILib struct-array bytes for the samples."]
    #[serde(rename = "samplesBase64")]
    pub samples_base64: ::std::string::String,
    pub version: IncompleteTrajectoryProgressMessageVersion,
}
#[doc = "`IncompleteTrajectoryProgressMessageEvent`"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum IncompleteTrajectoryProgressMessageEvent {
    #[serde(rename = "incompleteTrajectory")]
    IncompleteTrajectory,
}
impl ::std::fmt::Display for IncompleteTrajectoryProgressMessageEvent {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::IncompleteTrajectory => f.write_str("incompleteTrajectory"),
        }
    }
}
impl ::std::str::FromStr for IncompleteTrajectoryProgressMessageEvent {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "incompleteTrajectory" => Ok(Self::IncompleteTrajectory),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for IncompleteTrajectoryProgressMessageEvent {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for IncompleteTrajectoryProgressMessageEvent {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "`IncompleteTrajectoryProgressMessageVersion`"]
#[derive(:: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(transparent)]
pub struct IncompleteTrajectoryProgressMessageVersion(i64);
impl ::std::ops::Deref for IncompleteTrajectoryProgressMessageVersion {
    type Target = i64;
    fn deref(&self) -> &i64 {
        &self.0
    }
}
impl ::std::convert::From<IncompleteTrajectoryProgressMessageVersion> for i64 {
    fn from(value: IncompleteTrajectoryProgressMessageVersion) -> Self {
        value.0
    }
}
impl ::std::convert::TryFrom<i64> for IncompleteTrajectoryProgressMessageVersion {
    type Error = self::error::ConversionError;
    fn try_from(value: i64) -> ::std::result::Result<Self, self::error::ConversionError> {
        if ![1_i64].contains(&value) {
            Err("invalid value".into())
        } else {
            Ok(Self(value))
        }
    }
}
impl<'de> ::serde::Deserialize<'de> for IncompleteTrajectoryProgressMessageVersion {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        Self::try_from(<i64>::deserialize(deserializer)?)
            .map_err(|e| <D::Error as ::serde::de::Error>::custom(e.to_string()))
    }
}
#[doc = "Constraint: keep the robot within a circular field region."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct KeepInCircle {
    #[doc = "Circle radius (m)"]
    pub r: Expr,
    #[serde(rename = "type")]
    pub type_: KeepInCircleType,
    #[doc = "Circle center X (m)"]
    pub x: Expr,
    #[doc = "Circle center Y (m)"]
    pub y: Expr,
}
#[doc = "`KeepInCircleType`"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum KeepInCircleType {
    KeepInCircle,
}
impl ::std::fmt::Display for KeepInCircleType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::KeepInCircle => f.write_str("KeepInCircle"),
        }
    }
}
impl ::std::str::FromStr for KeepInCircleType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "KeepInCircle" => Ok(Self::KeepInCircle),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for KeepInCircleType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for KeepInCircleType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "Constraint: maximum rotational speed."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct MaxAngularVelocity {
    #[doc = "Maximum angular speed (rad/s)"]
    pub max: Expr,
    #[serde(rename = "type")]
    pub type_: MaxAngularVelocityType,
}
#[doc = "`MaxAngularVelocityType`"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum MaxAngularVelocityType {
    MaxAngularVelocity,
}
impl ::std::fmt::Display for MaxAngularVelocityType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::MaxAngularVelocity => f.write_str("MaxAngularVelocity"),
        }
    }
}
impl ::std::str::FromStr for MaxAngularVelocityType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "MaxAngularVelocity" => Ok(Self::MaxAngularVelocity),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for MaxAngularVelocityType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for MaxAngularVelocityType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "Constraint: maximum linear speed along the path."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct MaxVelocity {
    #[doc = "Maximum speed (m/s)"]
    pub max: Expr,
    #[serde(rename = "type")]
    pub type_: MaxVelocityType,
}
#[doc = "`MaxVelocityType`"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum MaxVelocityType {
    MaxVelocity,
}
impl ::std::fmt::Display for MaxVelocityType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::MaxVelocity => f.write_str("MaxVelocity"),
        }
    }
}
impl ::std::str::FromStr for MaxVelocityType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "MaxVelocity" => Ok(Self::MaxVelocity),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for MaxVelocityType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for MaxVelocityType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "Drivetrain motor model parameters."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct MotorConfig {
    #[doc = "No-load speed (rad/s)"]
    pub free_speed: Expr,
    #[doc = "Torque constant (N·m/A)"]
    #[serde(rename = "kT")]
    pub k_t: Expr,
    #[doc = "Back-EMF constant (V·s/rad)"]
    #[serde(rename = "kV")]
    pub k_v: Expr,
    #[doc = "Stall torque (N·m)"]
    pub stall_torque: Expr,
    #[doc = "Stator current limit (A)"]
    pub stator_limit: Expr,
    #[doc = "Supply current limit (A)"]
    pub supply_limit: Expr,
}
#[doc = "Trajectory parameters: waypoints, constraints, and target time step."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Parameters {
    pub constraints: ::std::vec::Vec<Constraint>,
    #[doc = "Target optimization time step (s)"]
    pub target_dt: Expr,
    pub waypoints: ::std::vec::Vec<Waypoint>,
}
#[doc = "A 2D pose parameterized by Expr values."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Pose2e {
    #[doc = "Heading (rad)"]
    pub heading: Expr,
    #[doc = "X coordinate (m)"]
    pub x: Expr,
    #[doc = "Y coordinate (m)"]
    pub y: Expr,
}
#[doc = "Named pose variable keyed by UUID in variables.poses."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct PoseVariableEntry {
    pub name: PoseVariableEntryName,
    pub value: Pose2e,
}
#[doc = "`PoseVariableEntryName`"]
#[derive(:: serde :: Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct PoseVariableEntryName(::std::string::String);
impl ::std::ops::Deref for PoseVariableEntryName {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<PoseVariableEntryName> for ::std::string::String {
    fn from(value: PoseVariableEntryName) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for PoseVariableEntryName {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() < 1usize {
            return Err("shorter than 1 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for PoseVariableEntryName {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for PoseVariableEntryName {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for PoseVariableEntryName {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
#[doc = "All supported JSON progress update messages emitted by the C++ progress-update-sender."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(untagged)]
pub enum ProgressUpdateMessage {
    IncompleteTrajectoryProgressMessage(IncompleteTrajectoryProgressMessage),
    DiagnosticProgressMessage(DiagnosticProgressMessage),
    ErrorProgressMessage(ErrorProgressMessage),
    CompleteTrajectoryProgressMessage(CompleteTrajectoryProgressMessage),
}
impl ::std::convert::From<IncompleteTrajectoryProgressMessage> for ProgressUpdateMessage {
    fn from(value: IncompleteTrajectoryProgressMessage) -> Self {
        Self::IncompleteTrajectoryProgressMessage(value)
    }
}
impl ::std::convert::From<DiagnosticProgressMessage> for ProgressUpdateMessage {
    fn from(value: DiagnosticProgressMessage) -> Self {
        Self::DiagnosticProgressMessage(value)
    }
}
impl ::std::convert::From<ErrorProgressMessage> for ProgressUpdateMessage {
    fn from(value: ErrorProgressMessage) -> Self {
        Self::ErrorProgressMessage(value)
    }
}
impl ::std::convert::From<CompleteTrajectoryProgressMessage> for ProgressUpdateMessage {
    fn from(value: CompleteTrajectoryProgressMessage) -> Self {
        Self::CompleteTrajectoryProgressMessage(value)
    }
}
#[doc = "Contents of a .chor project file: robot config, drive type, document-level variables, and code-gen settings."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct ProjectFile {
    pub codegen: CodeGenConfig,
    pub config: RobotConfig,
    pub name: ::std::string::String,
    #[serde(rename = "type")]
    pub type_: DriveType,
    #[doc = "Stable UUID for this project document."]
    pub uuid: Uuid,
    pub variables: Variables,
    #[doc = "File format version"]
    pub version: i64,
}
#[doc = "A 2D oriented rectangular/elliptical region parameterized by Expr values."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Region2e {
    #[doc = "Height (m)"]
    pub h: Expr,
    #[doc = "Rotation (rad)"]
    pub heading: Expr,
    #[doc = "Width (m)"]
    pub w: Expr,
    #[doc = "Center X (m)"]
    pub x: Expr,
    #[doc = "Center Y (m)"]
    pub y: Expr,
}
#[doc = "Named region variable keyed by UUID in variables.regions."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RegionVariableEntry {
    pub name: RegionVariableEntryName,
    pub value: Region2e,
}
#[doc = "`RegionVariableEntryName`"]
#[derive(:: serde :: Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct RegionVariableEntryName(::std::string::String);
impl ::std::ops::Deref for RegionVariableEntryName {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<RegionVariableEntryName> for ::std::string::String {
    fn from(value: RegionVariableEntryName) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for RegionVariableEntryName {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() < 1usize {
            return Err("shorter than 1 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for RegionVariableEntryName {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for RegionVariableEntryName {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for RegionVariableEntryName {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
#[doc = "Complete physical robot configuration."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RobotConfig {
    #[doc = "Bumper vertices in counter-clockwise order, robot-relative (m)"]
    pub bumpers: ::std::vec::Vec<Translation2e>,
    #[doc = "Wheel coefficient of friction (dimensionless)"]
    pub cof: Expr,
    #[doc = "Track width for differential drive (m)"]
    pub differential_track_width: Expr,
    #[doc = "Motor-to-wheel gear ratio (dimensionless)"]
    pub gearing: Expr,
    #[doc = "Moment of inertia (kg·m²)"]
    pub inertia: Expr,
    #[doc = "Robot mass (kg)"]
    pub mass: Expr,
    pub motor: MotorConfig,
    #[doc = "Wheel radius (m)"]
    pub radius: Expr,
    #[doc = "Swerve module positions relative to robot center: [FL, BL, BR, FR] (m)"]
    pub wheels: [Translation2e; 4usize],
}
#[doc = "A generated trajectory for one drive type (Trajectory<SwerveDriveType> or Trajectory<DifferentialDriveType>)."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Trajectory {
    #[doc = "Drive-type discriminator tag."]
    pub sample_type: TrajectorySampleType,
    #[doc = "Drive-type-specific trajectory samples serialized by WPILib (Swerve -> HolonomicSample, Differential -> DifferentialSample)."]
    pub samples: TrajectorySamples,
    #[doc = "Sample indices at which trajectory splits begin."]
    pub splits: ::std::vec::Vec<u64>,
    #[doc = "Trajectory timestamps (s) corresponding to each waypoint."]
    pub waypoints: ::std::vec::Vec<f64>,
}
#[doc = "Contents of a .traj file: a single named trajectory with its parameters and events."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct TrajectoryFile {
    #[doc = "Robot config snapshot used when the trajectory was generated; null if not stored."]
    #[serde(skip_serializing_if = "::std::option::Option::is_none")]
    pub config: ::std::option::Option<RobotConfig>,
    pub events: ::std::vec::Vec<EventMarker>,
    pub name: ::std::string::String,
    #[doc = "Current (editable) trajectory parameters."]
    pub params: Parameters,
    #[doc = "Frozen parameter snapshot from the last generation run; null if not generated yet."]
    #[serde(skip_serializing_if = "::std::option::Option::is_none")]
    pub snapshot: ::std::option::Option<Parameters>,
    #[doc = "Generated trajectory output; null if not yet generated."]
    #[serde(skip_serializing_if = "::std::option::Option::is_none")]
    pub trajectory: ::std::option::Option<Trajectory>,
    #[doc = "Stable UUID for this trajectory document."]
    pub uuid: Uuid,
    #[doc = "File format version"]
    pub version: u64,
}
#[doc = "Drive-type discriminator tag."]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum TrajectorySampleType {
    Swerve,
    Differential,
}
impl ::std::fmt::Display for TrajectorySampleType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Swerve => f.write_str("Swerve"),
            Self::Differential => f.write_str("Differential"),
        }
    }
}
impl ::std::str::FromStr for TrajectorySampleType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "Swerve" => Ok(Self::Swerve),
            "Differential" => Ok(Self::Differential),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for TrajectorySampleType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for TrajectorySampleType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "Drive-type-specific trajectory samples serialized by WPILib (Swerve -> HolonomicSample, Differential -> DifferentialSample)."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(untagged)]
pub enum TrajectorySamples {
    HolonomicSamplesContainer(HolonomicSamplesContainer),
    DifferentialSamplesContainer(DifferentialSamplesContainer),
}
impl ::std::convert::From<HolonomicSamplesContainer> for TrajectorySamples {
    fn from(value: HolonomicSamplesContainer) -> Self {
        Self::HolonomicSamplesContainer(value)
    }
}
impl ::std::convert::From<DifferentialSamplesContainer> for TrajectorySamples {
    fn from(value: DifferentialSamplesContainer) -> Self {
        Self::DifferentialSamplesContainer(value)
    }
}
#[doc = "A 2D translation parameterized by Expr values (metres)."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Translation2e {
    #[doc = "X coordinate (m)"]
    pub x: Expr,
    #[doc = "Y coordinate (m)"]
    pub y: Expr,
}
#[doc = "Named translation variable keyed by UUID in variables.translations."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct TranslationVariableEntry {
    pub name: TranslationVariableEntryName,
    pub value: Translation2e,
}
#[doc = "`TranslationVariableEntryName`"]
#[derive(:: serde :: Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct TranslationVariableEntryName(::std::string::String);
impl ::std::ops::Deref for TranslationVariableEntryName {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<TranslationVariableEntryName> for ::std::string::String {
    fn from(value: TranslationVariableEntryName) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for TranslationVariableEntryName {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() < 1usize {
            return Err("shorter than 1 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for TranslationVariableEntryName {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for TranslationVariableEntryName {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for TranslationVariableEntryName {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
#[doc = "A stable persisted UUID string."]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
#[serde(transparent)]
pub struct Uuid(pub ::std::string::String);
impl ::std::ops::Deref for Uuid {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<Uuid> for ::std::string::String {
    fn from(value: Uuid) -> Self {
        value.0
    }
}
impl ::std::convert::From<::std::string::String> for Uuid {
    fn from(value: ::std::string::String) -> Self {
        Self(value)
    }
}
impl ::std::fmt::Display for Uuid {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        self.0.fmt(f)
    }
}
impl ::std::str::FromStr for Uuid {
    type Err = ::std::convert::Infallible;
    fn from_str(value: &str) -> ::std::result::Result<Self, Self::Err> {
        Ok(Self(value.to_string()))
    }
}
#[doc = "A document-level scalar variable payload. The dimension tag selects the SI unit."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Variable {
    #[doc = "Dimension tag (matches choreo::dimensions::*::tag)"]
    pub dimension: VariableDimension,
    pub var: Expr,
}
#[doc = "Dimension tag (matches choreo::dimensions::*::tag)"]
#[derive(
    :: serde :: Deserialize,
    :: serde :: Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum VariableDimension {
    Number,
    Length,
    LinVel,
    LinAcc,
    Angle,
    AngVel,
    AngAcc,
    Time,
    Mass,
    Torque,
    MoI,
    Current,
    #[serde(rename = "KT")]
    Kt,
    #[serde(rename = "KV")]
    Kv,
}
impl ::std::fmt::Display for VariableDimension {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Number => f.write_str("Number"),
            Self::Length => f.write_str("Length"),
            Self::LinVel => f.write_str("LinVel"),
            Self::LinAcc => f.write_str("LinAcc"),
            Self::Angle => f.write_str("Angle"),
            Self::AngVel => f.write_str("AngVel"),
            Self::AngAcc => f.write_str("AngAcc"),
            Self::Time => f.write_str("Time"),
            Self::Mass => f.write_str("Mass"),
            Self::Torque => f.write_str("Torque"),
            Self::MoI => f.write_str("MoI"),
            Self::Current => f.write_str("Current"),
            Self::Kt => f.write_str("KT"),
            Self::Kv => f.write_str("KV"),
        }
    }
}
impl ::std::str::FromStr for VariableDimension {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "Number" => Ok(Self::Number),
            "Length" => Ok(Self::Length),
            "LinVel" => Ok(Self::LinVel),
            "LinAcc" => Ok(Self::LinAcc),
            "Angle" => Ok(Self::Angle),
            "AngVel" => Ok(Self::AngVel),
            "AngAcc" => Ok(Self::AngAcc),
            "Time" => Ok(Self::Time),
            "Mass" => Ok(Self::Mass),
            "Torque" => Ok(Self::Torque),
            "MoI" => Ok(Self::MoI),
            "Current" => Ok(Self::Current),
            "KT" => Ok(Self::Kt),
            "KV" => Ok(Self::Kv),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for VariableDimension {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for VariableDimension {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
#[doc = "All document-level variables keyed by UUID, grouped by variable kind."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, Default, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Variables {
    #[doc = "Scalar/dimensional variables keyed by UUID."]
    #[serde(
        default,
        skip_serializing_if = ":: std :: collections :: BTreeMap::is_empty"
    )]
    pub expressions: ::std::collections::BTreeMap<::std::string::String, ExpressionVariableEntry>,
    #[doc = "2D pose variables keyed by UUID."]
    #[serde(
        default,
        skip_serializing_if = ":: std :: collections :: BTreeMap::is_empty"
    )]
    pub poses: ::std::collections::BTreeMap<::std::string::String, PoseVariableEntry>,
    #[doc = "2D region variables keyed by UUID."]
    #[serde(
        default,
        skip_serializing_if = ":: std :: collections :: BTreeMap::is_empty"
    )]
    pub regions: ::std::collections::BTreeMap<::std::string::String, RegionVariableEntry>,
    #[doc = "2D translation variables keyed by UUID."]
    #[serde(
        default,
        skip_serializing_if = ":: std :: collections :: BTreeMap::is_empty"
    )]
    pub translations: ::std::collections::BTreeMap<::std::string::String, TranslationVariableEntry>,
}
#[doc = "A trajectory waypoint with pose and optimization hints."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Waypoint {
    #[doc = "Constrain heading exactly during optimization"]
    pub fix_heading: bool,
    #[doc = "Constrain XY position exactly during optimization"]
    pub fix_translation: bool,
    #[doc = "Heading (rad)"]
    pub heading: Expr,
    #[doc = "Optimization intervals to next waypoint"]
    pub intervals: u64,
    #[doc = "Use intervals instead of auto-selection"]
    pub override_intervals: bool,
    #[doc = "Start a new trajectory split here"]
    pub split: bool,
    #[doc = "Stable UUID for this waypoint."]
    pub uuid: Uuid,
    #[doc = "X position (m)"]
    pub x: Expr,
    #[doc = "Y position (m)"]
    pub y: Expr,
}
#[doc = "Identifies a waypoint by UUID or by a first/last sentinel string."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
pub enum WaypointId {
    #[doc = "Waypoint by UUID."]
    #[serde(rename = "uuid")]
    Uuid(Uuid),
    #[doc = "The first waypoint."]
    #[serde(rename = "first")]
    First,
    #[doc = "The last waypoint."]
    #[serde(rename = "last")]
    Last,
}
impl ::std::convert::From<Uuid> for WaypointId {
    fn from(value: Uuid) -> Self {
        Self::Uuid(value)
    }
}
#[doc = "WPILib ChassisAccelerations in field coordinates."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct WpiChassisAccelerations {
    #[doc = "Angular acceleration (rad/s^2)"]
    pub alpha: f64,
    #[doc = "X acceleration (m/s^2)"]
    pub ax: f64,
    #[doc = "Y acceleration (m/s^2)"]
    pub ay: f64,
}
#[doc = "WPILib ChassisVelocities in field coordinates."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct WpiChassisVelocities {
    #[doc = "Angular velocity (rad/s)"]
    pub omega: f64,
    #[doc = "X velocity (m/s)"]
    pub vx: f64,
    #[doc = "Y velocity (m/s)"]
    pub vy: f64,
}
#[doc = "WPILib Pose2d with translation and rotation."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct WpiPose2d {
    pub rotation: WpiRotation2d,
    pub translation: WpiTranslation2d,
}
#[doc = "WPILib Rotation2d in radians."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct WpiRotation2d {
    #[doc = "Rotation angle (rad)"]
    pub radians: f64,
}
#[doc = "WPILib Translation2d in metres."]
#[derive(:: serde :: Deserialize, :: serde :: Serialize, Clone, Debug, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct WpiTranslation2d {
    #[doc = "X position (m)"]
    pub x: f64,
    #[doc = "Y position (m)"]
    pub y: f64,
}
#[doc = " Generation of default values for serde."]
pub mod defaults {
    pub(super) fn default_bool<const V: bool>() -> bool {
        V
    }
}
#[doc = " Error types."]
pub mod error {
    #[doc = r" Error from a `TryFrom` or `FromStr` implementation."]
    pub struct ConversionError(::std::borrow::Cow<'static, str>);
    impl ::std::error::Error for ConversionError {}
    impl ::std::fmt::Display for ConversionError {
        fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> Result<(), ::std::fmt::Error> {
            ::std::fmt::Display::fmt(&self.0, f)
        }
    }
    impl ::std::fmt::Debug for ConversionError {
        fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> Result<(), ::std::fmt::Error> {
            ::std::fmt::Debug::fmt(&self.0, f)
        }
    }
    impl From<&'static str> for ConversionError {
        fn from(value: &'static str) -> Self {
            Self(value.into())
        }
    }
    impl From<String> for ConversionError {
        fn from(value: String) -> Self {
            Self(value.into())
        }
    }
}
