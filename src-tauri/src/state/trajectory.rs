use sqlx::{sqlite::SqliteRow, Error, FromRow, Pool, Row, Sqlite};
use trajoptlib::{HolonomicTrajectory, HolonomicTrajectorySample};


pub static SAMP_KEYS: &str = 
"timestamp, x, y, heading, velocity_x, velocity_y, angular_velocity";
pub static KEYS : &str =
"path_id, idx, timestamp, x, y, heading, velocity_x, velocity_y, angular_velocity";

pub async fn create_samples_table(
    pool: &Pool<Sqlite>,
) -> Result<(), Error> {
    sqlx::query(
        "Create table samples (
            path_id INT NOT NULL,
            idx INT NOT NULL,
            timestamp REAL NOT NULL,
            x REAL NOT NULL,
            y REAL NOT NULL,
            heading REAL NOT NULL,
            velocity_x REAL NOT NULL,
            velocity_y REAL NOT NULL,
            angular_velocity REAL NOT NULL,
            primary key (path_id, idx)
        )
    ",
    )
    .execute(pool)
    .await?;
Ok(())
}

pub async fn insert_trajectory(pool: &Pool<Sqlite>, path_id: &i64, traj: &HolonomicTrajectory) -> Result<(), Error> {
    let len = traj.samples.len();
    for i in 0..len {
        let samp = &traj.samples[i];
        let update_res = sqlx::query(
            "
            UPDATE samples SET
            timestamp = ?,
            x = ?,
            y = ?,
            heading = ?,
            velocity_x = ?,
            velocity_y = ?,
            angular_velocity = ?
            WHERE path_id == ? AND idx == ?
            ",
            )

            .bind(samp.timestamp)
            .bind(samp.x)
            .bind(samp.y)
            .bind(samp.heading)
            .bind(samp.velocity_x)
            .bind(samp.velocity_y)
            .bind(samp.angular_velocity)
            .bind(path_id)
            .bind(i as i64)
            .execute(pool)
            .await?;
        if update_res.rows_affected() == 0 {
            println!("Insert {i}");
            sqlx::query(
                format!("
                INSERT INTO samples ({})
                SELECT ?,?, ?,?,?,?, ?,?,?
                ", KEYS).as_str(),
                )
                .bind(path_id)
                .bind(i as i64)
                .bind(samp.timestamp)
                .bind(samp.x)
                .bind(samp.y)
                .bind(samp.heading)
                .bind(samp.velocity_x)
                .bind(samp.velocity_y)
                .bind(samp.angular_velocity)
                .execute(pool)
                .await?;
        }
    }
    sqlx::query(
        "DELETE FROM samples
        WHERE path_id == ? AND idx >= ? "
        )
        .bind(path_id)
        .bind(len as i64)
        .execute(pool)
        .await?;
    Ok(())
}

pub async fn get_sample(pool: &Pool<Sqlite>, path_id: &i64, idx: &i64) -> Result<Option<HolonomicTrajectorySample>, Error> {
    let res = sqlx::query::<Sqlite>(
        format!(
            "SELECT {}
        FROM samples WHERE path_id == ? AND idx == ?",
            SAMP_KEYS
        )
        .as_str(),
    )
    .bind(path_id)
    .bind(idx)
    .fetch_optional(pool)
    .await?;
    if let Some(row) = res{
        let samp = sample_from_row(&row)?;
        return Ok(Some(samp));
    } else {
        return Ok(None);
    }
}


pub async fn get_trajectory(pool: &Pool<Sqlite>, path_id: &i64) -> Result<Vec<HolonomicTrajectorySample>, Error> {
    let res = sqlx::query::<Sqlite>(
        format!(
            "SELECT {}
        FROM samples WHERE path_id == ?
        ORDER BY idx",
            SAMP_KEYS
        )
        .as_str(),
    )
    .bind(path_id)
    .fetch_all(pool)
    .await?;
    res.iter().map(|row|sample_from_row(row)).collect()
}

/// Convert a row of the `samples` table into a HolonomicTrajectorySample.
fn sample_from_row(row: &SqliteRow) -> Result<HolonomicTrajectorySample, Error> {
    let timestamp = row.try_get("timestamp")?;
    let x = row.try_get("x")?;
    let y = row.try_get("y")?;
    let heading = row.try_get("heading")?;
    let velocity_x = row.try_get("velocity_x")?;
    let velocity_y = row.try_get("velocity_y")?;
    let angular_velocity = row.try_get("y")?;

    Ok(HolonomicTrajectorySample{
        timestamp,
        x, y, heading, velocity_x, velocity_y, angular_velocity
    })
}

