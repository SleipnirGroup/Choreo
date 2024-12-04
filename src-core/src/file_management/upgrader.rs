use crate::{ChoreoError, ChoreoResult};
use serde_json::Value as JsonValue;

pub trait JsonPath: std::fmt::Debug {
    fn try_as_json_path(&self) -> Option<Vec<String>>;
}

impl JsonPath for str {
    fn try_as_json_path(&self) -> Option<Vec<String>> {
        Some(self.split('.').map(|s| s.to_string()).collect())
    }
}

impl JsonPath for &str {
    fn try_as_json_path(&self) -> Option<Vec<String>> {
        Some(self.split('.').map(|s| s.to_string()).collect())
    }
}

impl JsonPath for String {
    fn try_as_json_path(&self) -> Option<Vec<String>> {
        Some(self.split('.').map(|s| s.to_string()).collect())
    }
}

impl JsonPath for &[&str] {
    fn try_as_json_path(&self) -> Option<Vec<String>> {
        Some(self.iter().map(|s| s.to_string()).collect())
    }
}

#[derive(Debug)]
pub struct Editor {
    jdata: JsonValue,
}

impl Editor {
    pub fn new(jdata: JsonValue) -> Self {
        Self { jdata }
    }

    pub fn has_path(&self, path: impl JsonPath) -> bool {
        let mut jdata = &self.jdata;
        let path = if let Some(path) = path.try_as_json_path() {
            path
        } else {
            return false;
        };
        for key in path {
            if let Some(value) = jdata.get(key) {
                jdata = value;
            } else {
                return false;
            }
        }
        true
    }

    pub fn get_path_raw(&self, path: impl JsonPath) -> Option<&JsonValue> {
        let mut jdata = &self.jdata;
        for key in path.try_as_json_path()? {
            if let Some(value) = jdata.get(key) {
                jdata = value;
            } else {
                return None;
            }
        }
        Some(jdata)
    }

    pub fn get_path<T: serde::de::DeserializeOwned>(&self, path: impl JsonPath) -> ChoreoResult<T> {
        let jdata = self
            .get_path_raw(path)
            .ok_or(ChoreoError::Json("Invalid JSON path".to_string()))?;
        serde_json::from_value(jdata.clone()).map_err(Into::into)
    }

    /// Set the value of a JSON path. If the path does not exist, it will be created.
    ///
    /// # Arguments
    /// - `path`: The JSON path to set the value of.
    /// - `value`: The value to set.
    pub fn set_path(
        &mut self,
        path: impl JsonPath,
        value: impl Into<JsonValue>,
    ) -> ChoreoResult<()> {
        let mut jdata = &mut self.jdata;
        let keys = path.try_as_json_path().ok_or(ChoreoError::Json(format!(
            "Invalid JSON path of {:?}",
            path
        )))?;
        if keys.is_empty() {
            return Err(ChoreoError::Json("Empty JSON path".to_string()));
        }
        for key in keys.iter().take(keys.len() - 1) {
            if let Some(obj) = jdata.as_object_mut() {
                jdata = obj
                    .entry(key.to_string())
                    .or_insert(JsonValue::Object(Default::default()));
            } else {
                return Err(ChoreoError::Json(format!(
                    "Invalid JSON path of {:?}, {:?} is already assigned to a non object value",
                    path, key
                )));
            }
        }
        if let Some(obj) = jdata.as_object_mut() {
            obj.insert(keys.last().unwrap().to_string(), value.into());
        } else {
            return Err(ChoreoError::Json(format!(
                "Invalid JSON path of {:?}, {:?} is already assigned to a non object value",
                path,
                keys.last().unwrap()
            )));
        }

        Ok(())
    }

    pub fn set_path_serialize<T: serde::Serialize>(
        &mut self,
        path: impl JsonPath,
        value: T,
    ) -> ChoreoResult<()> {
        self.set_path(path, serde_json::to_value(value)?)
    }
}

pub trait UpgradeAction: Send + Sync {
    fn upgrade(&self, editor: &mut Editor) -> ChoreoResult<()>;
}

impl UpgradeAction for fn(&mut Editor) -> ChoreoResult<()> {
    fn upgrade(&self, editor: &mut Editor) -> ChoreoResult<()> {
        self(editor)
    }
}

impl UpgradeAction for fn(&mut Editor) {
    fn upgrade(&self, editor: &mut Editor) -> ChoreoResult<()> {
        self(editor);
        Ok(())
    }
}

type UpgradeFn = fn(&mut Editor) -> ChoreoResult<()>;

#[derive(Debug, Clone)]
pub struct Upgrader {
    actions: Vec<UpgradeFn>,
    current_version: u32,
}

impl Upgrader {
    pub fn new(current_version: u32) -> Self {
        Self {
            actions: Vec::new(),
            current_version
        }
    }

    pub fn add_version_action(&mut self, action: UpgradeFn) {
        self.actions.push(action);
    }

    pub fn upgrade(&self, jdata: JsonValue) -> ChoreoResult<JsonValue> {
        let version =
            get_version(&jdata).ok_or(ChoreoError::Json("Invalid JSON version".to_string()))?;
        let mut editor = Editor::new(jdata);
        for action in &self.actions[version as usize..] {
            action.upgrade(&mut editor)?;
        }
        editor.set_path("version", self.current_version)?;
        Ok(editor.jdata)
    }
}

pub fn get_version(jdata: &JsonValue) -> Option<u64> {
    jdata.get("version")?.as_u64().or(Some(0))
}