use crate::{codegen::java::validate_name::validate_name, spec::project::{Dimension, ProjectFile, Variable}};

struct JavaUnitData {
    java_type: &'static str,
    base_unit: &'static str
}
impl From<Dimension> for Option<JavaUnitData> {

fn from(dimension: Dimension) -> Option<JavaUnitData> {
    match dimension {
        Dimension::Number => None,
        Dimension::Length => Some(JavaUnitData {
            java_type: "Distance",
            base_unit: "Meters"
        }),
        Dimension::LinVel => Some(JavaUnitData {
            java_type: "LinearVelocity",
            base_unit: "MetersPerSecond"
        }),
        Dimension::LinAcc => Some(JavaUnitData {
            java_type: "LinearAcceleration",
            base_unit: "MetersPerSecondPerSecond"
        }),
        Dimension::Angle => Some(JavaUnitData {
            java_type: "Angle",
            base_unit: "Radians"
        }),
        Dimension::AngVel => Some(JavaUnitData {
            java_type: "AngularVelocity",
            base_unit: "RadiansPerSecond"
        }),
        Dimension::AngAcc => Some(JavaUnitData {
            java_type: "AngularAcceleration",
            base_unit: "RadiansPerSecondPerSecond"
        }),
        Dimension::Time => Some(JavaUnitData {
            java_type: "Time",
            base_unit: "Seconds"
        }),
        Dimension::Mass => Some(JavaUnitData {
            java_type: "Mass",
            base_unit: "Kilograms"
        }),
        Dimension::Torque => Some(JavaUnitData {
            java_type: "Torque",
            base_unit: "NewtonMeters"
        }),
        Dimension::MoI => Some(JavaUnitData {
            java_type: "MomentOfInertia",
            base_unit: "KilogramSquareMeters"
        }),
    }
}
}

fn format_variable(name: &String, variable: &Variable) -> String {
    let val = variable.var.val;
    let opt_unit_data = Option::<JavaUnitData>::from(variable.dimension);
    let def = match opt_unit_data {
        Some(JavaUnitData {java_type, base_unit}) => format!("public static final {java_type} {name} = Units.{base_unit}.of({val});"),
        None => format!("public static final double {name} = {val};"),
    };
    let err_msg = match validate_name(name) {
        Ok(_) => String::new(),
        Err(e) => e.javadoc_comment()
    };
    format!("\t{err_msg}{def}")
}
const VARS_FILENAME: &str = "ChoreoVars";

pub fn generate_vars_file(project: ProjectFile, package_name: String) -> String {
    let variable_defs = 
      project.variables.expressions
        .iter()
        .map(|(name, variable)| format_variable(name, variable))
        .collect::<Vec<String>>()
        .join("\n");
    format!(r#"package {package_name};
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;
import edu.wpi.first.units.Units;
import edu.wpi.first.units.measure.*;

/**
 * Generated file containing variables defined in Choreo.
 * DO NOT MODIFY THIS FILE YOURSELF; instead, change these values
 * in the Choreo GUI.
 */
public final class ${VARS_FILENAME} {{
{variable_defs}
}}
"#)
}