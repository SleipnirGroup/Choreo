use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use schemars::schema::RootSchema;
use typify::{TypeSpace, TypeSpaceSettings};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let crate_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let schema_path = crate_dir.join("..").join("schema.json");
    let output_path = crate_dir.join("src").join("generated.rs");

    let schema_contents = fs::read_to_string(&schema_path)?;
    let mut schema_value: serde_json::Value = serde_json::from_str(&schema_contents)?;
    let schema_version = schema_value
        .get("version")
        .and_then(serde_json::Value::as_u64)
        .ok_or("schema version must be an unsigned integer")?;
    normalize_const_keywords(&mut schema_value);
    let root_schema: RootSchema = serde_json::from_value(schema_value)?;

    let mut settings = TypeSpaceSettings::default();
    settings
        .with_derive("PartialEq".to_string())
        .with_map_type("::std::collections::BTreeMap");
    let mut type_space = TypeSpace::new(&settings);
    type_space.add_root_schema(root_schema)?;

    let generated = format!(
        "// This file is generated from document/schema.json. Do not edit manually.\n\n\
         pub const DOCUMENT_SCHEMA_VERSION: u32 = {schema_version};\n\n{}",
        type_space.to_stream()
    );
    write_formatted_if_changed(&output_path, &generated)?;

    println!("generated {}", output_path.display());
    Ok(())
}

fn normalize_const_keywords(value: &mut serde_json::Value) {
    match value {
        serde_json::Value::Array(values) => {
            for value in values {
                normalize_const_keywords(value);
            }
        }
        serde_json::Value::Object(object) => {
            if let Some(constant) = object.remove("const") {
                object.insert("enum".to_string(), serde_json::Value::Array(vec![constant]));
            }
            for value in object.values_mut() {
                normalize_const_keywords(value);
            }
        }
        _ => {}
    }
}

fn write_formatted_if_changed(
    path: &Path,
    contents: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let temporary_path = path.with_extension("rs.tmp");
    fs::write(&temporary_path, contents)?;
    let status = Command::new("rustfmt")
        .args(["--edition", "2024"])
        .arg(&temporary_path)
        .status()?;
    if !status.success() {
        return Err(format!("rustfmt failed with status {status}").into());
    }

    let formatted = fs::read_to_string(&temporary_path)?;
    if fs::read_to_string(path).is_ok_and(|current| current == formatted) {
        fs::remove_file(temporary_path)?;
        return Ok(());
    }

    fs::rename(temporary_path, path)?;
    Ok(())
}
