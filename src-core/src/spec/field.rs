use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub struct FieldCorners {
    pub top_left: (f64, f64),
    pub bottom_right: (f64, f64),
}
#[derive(Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum FieldUnit {
    Foot,
    Inch,
    #[default]
    Meter,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub struct FieldJSON {
    pub game: String,
    pub field_image: String,
    pub field_corners: FieldCorners,
    pub field_size: [f64; 2],
    #[serde(default)]
    pub size_pixels: (f64, f64),
    #[serde(default)]
    pub field_unit: FieldUnit,
    #[serde(default)]
    pub origin_fraction: (f64, f64),
}
