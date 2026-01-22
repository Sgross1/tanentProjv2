const sqlite3 = require('sqlite3').verbose();

const dbPath = '../tenantrating_v2.db';
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

const all = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

async function main() {
    try {
        const tables = await all("SELECT name FROM sqlite_master WHERE type='table'");

        console.log("Database Contents:");
        console.log("==================");

        for (const table of tables) {
            const tableName = table.name;
            if (tableName === 'sqlite_sequence') continue;

            console.log(`\nTable: ${tableName}`);
            console.log('-------------------');

            // Schema
            const columns = await all(`PRAGMA table_info(${tableName})`);
            console.log("Schema:");
            columns.forEach(c => console.log(` - ${c.name} (${c.type})`));

            // Data
            const rows = await all(`SELECT * FROM ${tableName} LIMIT 5`);
            console.log("\nData (First 5 rows):");
            if (rows.length > 0) {
                console.log(JSON.stringify(rows, null, 2));
            } else {
                console.log("(Empty)");
            }
            console.log('-------------------');
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        db.close();
    }
}

main();
