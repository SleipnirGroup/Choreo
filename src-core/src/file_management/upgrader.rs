use crate::{ChoreoError, ChoreoResult};
use serde_json::Value as JsonValue;

pub trait JsonPath: std::fmt::Debug + Clone {
    fn try_as_json_path(&self) -> Option<Vec<String>>;
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

    /**
     * Check if a JSON path exists.
     */
    pub fn has(&self, path: impl JsonPath) -> bool {
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

    /**
     * Get the value of a JSON path as a raw JSON value.
     *
     * # Arguments
     * - `path`: The JSON path to get the value of.
     */
    pub fn get_raw(&self, path: impl JsonPath) -> Option<&JsonValue> {
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

    /**
     * Get the value of a JSON path as a deserialized value.
     *
     * # Arguments
     * - `path`: The JSON path to get the value of.
     */
    pub fn get<T: serde::de::DeserializeOwned>(&self, path: impl JsonPath) -> ChoreoResult<T> {
        let jdata = self
            .get_raw(path)
            .ok_or(ChoreoError::Json("Invalid JSON path".to_string()))?;
        serde_json::from_value(jdata.clone()).map_err(Into::into)
    }

    /// Set the value of a JSON path.
    /// If the path does not exist, it will be created.
    ///
    /// # Arguments
    /// - `path`: The JSON path to set the value of.
    /// - `value`: The value to set.
    pub fn set_raw(
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

    /**
     * Set the value of a JSON path to a serializable value.
     * If the path does not exist, it will be created.
     *
     * # Arguments
     * - `path`: The JSON path to set the value of.
     * - `value`: The value to set.
     */
    pub fn set<T: serde::Serialize>(&mut self, path: impl JsonPath, value: T) -> ChoreoResult<()> {
        self.set_raw(path, serde_json::to_value(value)?)
    }

    /**
     * Delete a JSON path.
     *
     * # Arguments
     * - `path`: The JSON path to delete.
     */
    pub fn delete(&mut self, path: impl JsonPath) -> ChoreoResult<()> {
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
            obj.remove(keys.last().unwrap());
        } else {
            return Err(ChoreoError::Json(format!(
                "Invalid JSON path of {:?}, {:?} is already assigned to a non object value",
                path,
                keys.last().unwrap()
            )));
        }

        Ok(())
    }

    /**
     * Rename a JSON path.
     *
     * # Arguments
     * - `old_path`: The old JSON path.
     * - `new_path`: The new JSON path.
     */
    pub fn rename(&mut self, old_path: impl JsonPath, new_path: impl JsonPath) -> ChoreoResult<()> {
        let value = self
            .get_raw(old_path.clone())
            .ok_or(ChoreoError::Json("Invalid JSON path".to_string()))?;
        self.set_raw(new_path, value.clone())?;
        self.delete(old_path)?;
        Ok(())
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
    hooks: Vec<UpgradeFn>,
    current_version: u64,
}

impl Upgrader {
    pub fn new(current_version: u64) -> Self {
        Self {
            actions: Vec::new(),
            hooks: Vec::new(),
            current_version,
        }
    }

    pub fn add_version_action(&mut self, action: UpgradeFn) {
        self.actions.push(action);
    }

    pub fn add_upgrade_hook(&mut self, action: UpgradeFn) {
        self.hooks.push(action);
    }

    pub fn upgrade(&self, jdata: JsonValue) -> ChoreoResult<JsonValue> {
        let version = get_version(&jdata)
            .ok_or(ChoreoError::Json("Could not find JSON version".to_string()))?;

        // early return if the version is already the current version
        // or if the version is newer than the current version
        match version {
            v if v == self.current_version => return Ok(jdata),
            v if v > self.current_version => {
                return Err(ChoreoError::Json("JSON version newer than app".to_string()))
            }
            _ => {}
        }

        let mut editor = Editor::new(jdata);
        // hooks will only run if an upgrade occurs
        for action in &self.hooks {
            action(&mut editor)?;
        }
        for action in &self.actions[version as usize..] {
            action.upgrade(&mut editor)?;
        }
        editor.set_raw("version", self.current_version)?;
        Ok(editor.jdata)
    }
}

pub fn get_version(jdata: &JsonValue) -> Option<u64> {
    jdata.get("version")?.as_u64().or(Some(0))
}
