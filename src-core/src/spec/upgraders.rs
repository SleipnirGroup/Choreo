use serde_json::Value as JsonValue;

use crate::ChoreoResult;

mod traj_file {
    use std::sync::LazyLock;

    use crate::{file_management::upgrader::{Editor, Upgrader}, spec::Expr, ChoreoResult};

    pub(super) static TRAJ_UPGRADER: LazyLock<Upgrader> = LazyLock::new(make_upgrader);

    fn make_upgrader() -> Upgrader {
        let mut upgrader = Upgrader::new();
        upgrader.add_version_action(beta_to_one);

        upgrader
    }

    fn beta_to_one(editor: &mut Editor) -> ChoreoResult<()> {
        if editor.has_path("trajectory") {
            editor.set_path_serialize("trajectory.trackwidth", Expr::new("1 m", 1.0))
        } else {
            Ok(())
        }
    }
}

mod project_file {
    use std::sync::LazyLock;

    use crate::{file_management::upgrader::{Editor, Upgrader}, spec::Expr, ChoreoResult};

    pub(super) static PROJECT_UPGRADER: LazyLock<Upgrader> = LazyLock::new(make_upgrader);

    fn make_upgrader() -> Upgrader {
        let mut upgrader = Upgrader::new();
        upgrader.add_version_action(beta_to_one);

        upgrader
    }

    fn beta_to_one(editor: &mut Editor) -> ChoreoResult<()> {
        editor.set_path_serialize("config.cof", Expr::new("1.5", 1.5))
    }
}

pub fn upgrade_traj_file(jdata: JsonValue) -> ChoreoResult<JsonValue> {
    traj_file::TRAJ_UPGRADER.upgrade(jdata)
}

pub fn upgrade_project_file(jdata: JsonValue) -> ChoreoResult<JsonValue> {
    project_file::PROJECT_UPGRADER.upgrade(jdata)
}