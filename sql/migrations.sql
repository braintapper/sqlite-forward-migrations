CREATE TABLE IF NOT EXISTS migrations
      (
        id INTEGER PRIMARY KEY,
        version_tag TEXT not null,
        description TEXT not null,
        script_path TEXT not null,
        script_filename TEXT not null,
        script_md5 TEXT not null,
        executed_by TEXT not null,
        executed_at TEXT NOT NULL DEFAULT current_timestamp,
        execution_duration integer not null,
        success integer not null
      );