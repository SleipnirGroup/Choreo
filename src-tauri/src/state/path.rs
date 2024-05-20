
use serde::{Serialize, Deserialize};
use sqlx::{Error, Pool, Sqlite};
use tauri::Manager;
use trajoptlib::{HolonomicTrajectory, InitialGuessPoint, SwervePathBuilder};
use partially::Partial;

use super::{
    constraint::{
        get_path_constraints, ConstraintData,
    }, robotconfig::get_robot_config_impl, trajectory::insert_trajectory, utils::sqlx_stringify, waypoint::{
        add_waypoint_impl, get_waypoint_impl, scope_to_position, PartialWaypoint, Waypoint, WaypointID, KEYS
    }
};

pub async fn generate_trajectory(
    pool: &Pool<Sqlite>,
    path_id: i64,
) -> Result<HolonomicTrajectory, String> {
    let waypoint_ids = get_path_waypoint_ids_impl(pool, &path_id)
        .await
        .map_err(sqlx_stringify)?;
    let waypoints = get_path_waypoints_impl(pool, &path_id)
        .await
        .map_err(sqlx_stringify)?;
    let config = get_robot_config_impl(pool).await.map_err(sqlx_stringify)?;
    let constraints = get_path_constraints(pool, &path_id).await?;
    let mut path_builder = SwervePathBuilder::new();
    let mut wpt_cnt: usize = 0;
    let mut control_interval_counts: Vec<usize> = Vec::new();
    let mut guess_points_after_waypoint: Vec<InitialGuessPoint> = Vec::new();
    let mut actual_points: Vec<&WaypointID> = Vec::new();
    // get things from database first; fail fast

    for (idx, id) in waypoint_ids.iter().enumerate() {
        let wpt: &Waypoint = &waypoints[idx];
        println!("{:?}", wpt);
        if wpt.is_initial_guess {
            let guess_point: InitialGuessPoint = InitialGuessPoint {
                x: wpt.x,
                y: wpt.y,
                heading: wpt.heading,
            };
            guess_points_after_waypoint.push(guess_point);
            if let Some(last) = control_interval_counts.last_mut() {
                *last += (wpt.control_interval_count) as usize;
            }
        } else {
            if wpt_cnt > 0 {
                path_builder.sgmt_initial_guess_points(wpt_cnt - 1, &guess_points_after_waypoint);
            }

            guess_points_after_waypoint.clear();
            actual_points.push(id);

            if wpt.heading_constrained && wpt.translation_constrained {
                path_builder.pose_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                wpt_cnt += 1;
            } else if wpt.translation_constrained {
                path_builder.translation_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                wpt_cnt += 1;
            } else {
                path_builder.empty_wpt(wpt_cnt, wpt.x, wpt.y, wpt.heading);
                wpt_cnt += 1;
            }
            if idx != waypoint_ids.len() - 1 {
                control_interval_counts.push((wpt.control_interval_count) as usize);
            }
        }
    }

    path_builder.set_control_interval_counts(control_interval_counts);

    for constraint in constraints {
        let scope = &constraint.scope;
        let position_opt = (
            scope_to_position(&actual_points, &scope.0),
            scope_to_position(&actual_points, &scope.1),
        );
        let mut is_waypoint = false;

        let position: Option<(usize, usize)> = match position_opt {
            (None, None) => None,
            (Some(idx1), None) => {
                is_waypoint = true;
                Some((idx1, 0))
            }
            (None, Some(idx2)) => {
                is_waypoint = true;
                Some((idx2, 0))
            }
            (Some(idx1), Some(idx2)) => {
                if idx1 < idx2 {
                    Some((idx1, idx2))
                } else {
                    Some((idx2, idx1))
                }
            }
        };
        if position.is_none() {
            continue;
        }
        let position = position.unwrap();

        match constraint.data {
            ConstraintData::WptVelocityDirection { direction } => {
                if is_waypoint {
                    path_builder.wpt_linear_velocity_direction(position.0, direction);
                }
            }
            ConstraintData::WptZeroVelocity {} => {
                if is_waypoint {
                    path_builder.wpt_linear_velocity_max_magnitude(position.0, 0.0f64);
                }
            }
            ConstraintData::StopPoint {} => {
                if is_waypoint {
                    path_builder.wpt_linear_velocity_max_magnitude(position.0, 0.0f64);
                    path_builder.wpt_angular_velocity(position.0, 0.0);
                }
            }
            ConstraintData::MaxVelocity { velocity } => {
                if is_waypoint {
                    path_builder.wpt_linear_velocity_max_magnitude(position.0, velocity);
                } else {
                    path_builder
                        .sgmt_linear_velocity_max_magnitude(position.0, position.1, velocity);
                }
            }
            ConstraintData::ZeroAngularVelocity {} => {
                if is_waypoint {
                    path_builder.wpt_angular_velocity(position.0, 0.0);
                } else {
                    path_builder.sgmt_angular_velocity(position.0, position.1, 0.0);
                }
            }
            ConstraintData::StraightLine {} => {
                if !is_waypoint {
                    for point in position.0..position.1 {
                        let this_pt = point;
                        let next_pt = point + 1;
                        if this_pt != position.0 {
                            // points in between straight-line segments are automatically zero-velocity points
                            path_builder.wpt_linear_velocity_max_magnitude(this_pt, 0.0f64);
                        }
                        let pt1 = &waypoints[waypoint_ids
                            .iter()
                            .position(|pt| pt == actual_points[this_pt])
                            .unwrap()];

                        let pt2 = &waypoints[waypoint_ids
                            .iter()
                            .position(|pt| pt == actual_points[next_pt])
                            .unwrap()];
                        let x1 = pt1.x;
                        let x2 = pt2.x;
                        let y1 = pt1.y;
                        let y2 = pt2.y;
                        path_builder.sgmt_linear_velocity_direction(
                            this_pt,
                            next_pt,
                            (y2 - y1).atan2(x2 - x1),
                        )
                    }
                }
            }
            ConstraintData::PointAt { x, y, tolerance } => {
                if is_waypoint {
                    path_builder.wpt_point_at(position.0, x, y, tolerance)
                } else {
                    path_builder.sgmt_point_at(position.0, position.1, x, y, tolerance)
                }
            } // add more cases here to impl each constraint.
        }
    }
    path_builder.set_bumpers(config.bumper_length, config.bumper_width);

    // // Skip obstacles for now while we figure out whats wrong with them
    // for o in circleObstacles {
    //     path_builder.sgmt_circle_obstacle(0, wpt_cnt - 1, o.x, o.y, o.radius);
    // }

    // // Skip obstacles for now while we figure out whats wrong with them
    // for o in polygonObstacles {
    //     path_builder.sgmt_polygon_obstacle(0, wpt_cnt - 1, o.x, o.y, o.radius);
    // }
    path_builder.set_drivetrain(&config.as_drivetrain());
    let traj = path_builder.generate(true, path_id.clone())?;
    return Ok(traj);
}

pub async fn create_path_tables(
    pool: &Pool<Sqlite>,
) -> Result<<Sqlite as sqlx::Database>::QueryResult, Error> {
    // double linked list
    sqlx::query(
        "Create table path_waypoints (
                wpt INT,
                path INT,
                next INT references waypoints(id),
                prev INT references waypoints(id),
                primary key (wpt, path),
                CONSTRAINT WPT_FK
                    FOREIGN KEY (wpt)
                    REFERENCES waypoints(id)
            )
        ",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "Create table paths (
                path_id INT primary key,
                name VARCHAR(100)
            )
        ",
    )
    .execute(pool)
    .await
}

pub async fn add_path_waypoint_impl(
    pool: &Pool<Sqlite>,
    path_id: &i64,
    wpt_id: &i64,
) -> Result<(), sqlx::Error> {
    let current_last = sqlx::query_scalar::<Sqlite, i64>(
        "SELECT wpt FROM path_waypoints
    WHERE path==? AND next IS NULL
",
    )
    .bind(path_id)
    .fetch_optional(pool)
    .await?;
    // last needs to be the "prev" of our new waypoint, we can pass an Option
    sqlx::query(
        "INSERT INTO path_waypoints (path, wpt, prev, next) VALUES(
        ?, ?, ?, NULL)
        ",
    )
    .bind(path_id)
    .bind(wpt_id)
    .bind(current_last)
    .execute(pool)
    .await?;
    if let Some(last_wpt) = current_last {
        sqlx::query(
            "UPDATE path_waypoints SET next = ? WHERE wpt = ?
            ",
        )
        .bind(wpt_id)
        .bind(last_wpt)
        .execute(pool)
        .await?;
    }
    Ok(())
}


pub async fn delete_path_waypoint_impl(
    pool: &Pool<Sqlite>,
    path_id: &i64,
    wpt_id: &i64,
) -> Result<(), sqlx::Error> {
    let wpt_opt = get_waypoint_impl(pool, wpt_id).await?;
    if wpt_opt.is_none() {return Ok(())};
    let wpt = wpt_opt.unwrap();
    let (prev, next) = sqlx::query_as::<Sqlite, (Option<i64>, Option<i64>)>(
        "SELECT prev, next FROM path_waypoints
        WHERE path==? AND wpt==?",
    )
    .bind(path_id)
    .bind(wpt_id)
    .fetch_one(pool)
    .await?;
    println!("{:?} {:?}", prev, next);
    // TODO begin transaction
    // update prev's next
    let result: Result<sqlx::sqlite::SqliteQueryResult, sqlx::Error> = {
        sqlx::query("UPDATE path_waypoints SET next=? WHERE path==? AND wpt==?")
            .bind(next)
            .bind(path_id)
            .bind(prev)
            .execute(pool)
            .await?;
        // update next's prev
        sqlx::query("UPDATE path_waypoints SET prev=? WHERE path==? AND wpt==?")
            .bind(prev)
            .bind(path_id)
            .bind(next)
            .execute(pool)
            .await?;
        // delete target
        sqlx::query("DELETE FROM path_waypoints WHERE path==? AND wpt==?")
            .bind(path_id)
            .bind(wpt_id)
            .execute(pool)
            .await?;
        sqlx::query("UPDATE waypoints SET is_deleted=TRUE WHERE id==?")
            .bind(wpt_id)
            .execute(pool)
            .await
    };
    // TODO end transaction, rollback if necessary
    // if result is successful, ignore the query result and return Ok(wpt)
    result.map(|_r| ())
}
/*
 * Move the tgt waypoint before the before waypoint. if before is None, tgt is moved to the end of the list
 */
pub async fn reorder_waypoints_impl(_pool: &Pool<Sqlite>, _tgt: i64, _before: Option<i64>) {}
pub async fn get_path_waypoint_ids_impl(
    pool: &Pool<Sqlite>,
    path_id: &i64,
) -> Result<Vec<i64>, sqlx::Error> {
    sqlx::query_scalar::<Sqlite, i64>(
        "WITH RECURSIVE Path AS (
        SELECT * FROM path_waypoints WHERE prev IS NULL AND path == ?
        UNION ALL
        SELECT m.* FROM path_waypoints AS m JOIN Path AS t ON m.prev = t.wpt
    )
    SELECT wpt FROM Path;
    ",
    )
    .bind(path_id)
    .fetch_all(pool)
    .await
}

pub async fn get_path_waypoints_impl(
    pool: &Pool<Sqlite>,
    path_id: &i64,
) -> Result<Vec<Waypoint>, sqlx::Error> {
    sqlx::query_as::<Sqlite, Waypoint>(
        format!(
            "WITH RECURSIVE Path AS (
        SELECT * FROM path_waypoints WHERE prev IS NULL AND path == ?
        UNION ALL
        SELECT m.* FROM path_waypoints AS m
        JOIN Path AS t ON m.prev = t.wpt
    )
    SELECT {} FROM Path INNER JOIN waypoints ON wpt==id;
    ",
            KEYS
        )
        .as_str(),
    )
    .bind(path_id)
    .fetch_all(pool)
    .await
}
