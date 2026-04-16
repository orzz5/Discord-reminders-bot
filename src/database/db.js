const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, '../../reminders.db'));
        this.init();
    }

    init() {
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS reminders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    name TEXT NOT NULL,
                    time TEXT NOT NULL,
                    day TEXT NOT NULL,
                    timezone TEXT NOT NULL,
                    ping INTEGER NOT NULL,
                    repeat_days TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    active INTEGER DEFAULT 1
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS reminder_stats (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    reminder_id INTEGER NOT NULL,
                    status TEXT NOT NULL,
                    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (reminder_id) REFERENCES reminders (id)
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS user_streaks (
                    user_id TEXT PRIMARY KEY,
                    current_streak INTEGER DEFAULT 0,
                    longest_streak INTEGER DEFAULT 0,
                    last_completed DATETIME
                )
            `);
        });
    }

    createReminder(userId, name, time, day, timezone, ping, repeatDays = null) {
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
                INSERT INTO reminders (user_id, name, time, day, timezone, ping, repeat_days)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            
            stmt.run([userId, name, time, day, timezone, ping ? 1 : 0, repeatDays ? JSON.stringify(repeatDays) : null], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
            
            stmt.finalize();
        });
    }

    getReminders(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM reminders 
                WHERE user_id = ? AND active = 1 
                ORDER BY created_at ASC
            `, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const reminders = rows.map(row => ({
                        ...row,
                        ping: Boolean(row.ping),
                        repeat_days: row.repeat_days ? JSON.parse(row.repeat_days) : null
                    }));
                    resolve(reminders);
                }
            });
        });
    }

    getReminder(userId, reminderId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM reminders 
                WHERE user_id = ? AND id = ? AND active = 1
            `, [userId, reminderId], (err, row) => {
                if (err) {
                    reject(err);
                } else if (row) {
                    resolve({
                        ...row,
                        ping: Boolean(row.ping),
                        repeat_days: row.repeat_days ? JSON.parse(row.repeat_days) : null
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    updateReminder(userId, reminderId, updates) {
        return new Promise((resolve, reject) => {
            const fields = [];
            const values = [];

            if (updates.name !== undefined) {
                fields.push('name = ?');
                values.push(updates.name);
            }
            if (updates.time !== undefined) {
                fields.push('time = ?');
                values.push(updates.time);
            }
            if (updates.day !== undefined) {
                fields.push('day = ?');
                values.push(updates.day);
            }
            if (updates.timezone !== undefined) {
                fields.push('timezone = ?');
                values.push(updates.timezone);
            }
            if (updates.ping !== undefined) {
                fields.push('ping = ?');
                values.push(updates.ping ? 1 : 0);
            }
            if (updates.repeat_days !== undefined) {
                fields.push('repeat_days = ?');
                values.push(updates.repeat_days ? JSON.stringify(updates.repeat_days) : null);
            }

            if (fields.length === 0) {
                resolve(false);
                return;
            }

            values.push(userId, reminderId);

            const stmt = this.db.prepare(`
                UPDATE reminders 
                SET ${fields.join(', ')} 
                WHERE user_id = ? AND id = ?
            `);

            stmt.run(values, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });

            stmt.finalize();
        });
    }

    deactivateReminder(userId, reminderId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE reminders 
                SET active = 0 
                WHERE user_id = ? AND id = ?
            `, [userId, reminderId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    deleteReminder(userId, reminderId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                DELETE FROM reminders 
                WHERE user_id = ? AND id = ?
            `, [userId, reminderId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    deactivateAllReminders(userId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                UPDATE reminders 
                SET active = 0 
                WHERE user_id = ?
            `, [userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    deleteAllReminders(userId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                DELETE FROM reminders 
                WHERE user_id = ?
            `, [userId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes > 0);
                }
            });
        });
    }

    checkDuplicateReminder(userId, name, time, day, timezone, ping, repeatDays) {
        return new Promise((resolve, reject) => {
            const repeatDaysStr = repeatDays ? JSON.stringify(repeatDays) : null;
            
            this.db.get(`
                SELECT id FROM reminders 
                WHERE user_id = ? AND name = ? AND time = ? AND day = ? 
                AND timezone = ? AND ping = ? AND repeat_days = ? AND active = 1
            `, [userId, name, time, day, timezone, ping ? 1 : 0, repeatDaysStr], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(!!row);
                }
            });
        });
    }

    recordReminderCompletion(userId, reminderId, status) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO reminder_stats (user_id, reminder_id, status)
                VALUES (?, ?, ?)
            `, [userId, reminderId, status], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    getStats(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT 
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                    COUNT(CASE WHEN status = 'not_completed' THEN 1 END) as not_completed,
                    COUNT(*) as total
                FROM reminder_stats 
                WHERE user_id = ?
            `, [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        completed: row.completed || 0,
                        not_completed: row.not_completed || 0,
                        total: row.total || 0
                    });
                }
            });
        });
    }

    getStreak(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM user_streaks WHERE user_id = ?
            `, [userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({
                        current_streak: row ? row.current_streak : 0,
                        longest_streak: row ? row.longest_streak : 0
                    });
                }
            });
        });
    }

    updateStreak(userId, completed) {
        return new Promise((resolve, reject) => {
            if (completed) {
                this.db.run(`
                    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_completed)
                    VALUES (?, 1, 1, CURRENT_TIMESTAMP)
                    ON CONFLICT(user_id) DO UPDATE SET
                        current_streak = CASE 
                            WHEN date(last_completed) = date('now', '-1 day') 
                            THEN current_streak + 1
                            ELSE 1
                        END,
                        longest_streak = CASE 
                            WHEN CASE 
                                WHEN date(last_completed) = date('now', '-1 day') 
                                THEN current_streak + 1
                                ELSE 1
                            END > longest_streak 
                            THEN CASE 
                                WHEN date(last_completed) = date('now', '-1 day') 
                                THEN current_streak + 1
                                ELSE 1
                            END 
                            ELSE longest_streak 
                        END,
                        last_completed = CURRENT_TIMESTAMP
                `, [userId], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                this.db.run(`
                    UPDATE user_streaks 
                    SET current_streak = 0 
                    WHERE user_id = ?
                `, [userId], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }
        });
    }

    getAllActiveReminders() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM reminders 
                WHERE active = 1 
                ORDER BY day, time
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    const reminders = rows.map(row => ({
                        ...row,
                        ping: Boolean(row.ping),
                        repeat_days: row.repeat_days ? JSON.parse(row.repeat_days) : null
                    }));
                    resolve(reminders);
                }
            });
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = new Database();
