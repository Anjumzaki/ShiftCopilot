import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabase({name: 'shiftcopilot.db', location: 'default'}).then(
      async db => {
        await db.executeSql(`
          CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            fare_aed REAL,
            zone_id TEXT,
            source TEXT NOT NULL,
            raw_text TEXT NOT NULL
          );
        `);
        await db.executeSql(`
          CREATE TABLE IF NOT EXISTS notifications_raw (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            captured_at TEXT NOT NULL,
            package TEXT NOT NULL,
            title TEXT,
            text TEXT,
            parsed INTEGER DEFAULT 0
          );
        `);
        return db;
      },
    );
  }
  return dbPromise;
}
