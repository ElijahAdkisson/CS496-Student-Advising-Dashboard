//CS496 DATABASE FUNCTIONS
//WRITTEN BY FREDDY GOODWIN
//not really necessary i just separated this from the main because the parser used it too
//and also made it so the database is instantiated here
//other handy stuff to export will go here in the future if necessary

//requirement imports
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("database.db");//initialize database

//clearing temporary transcript data
function clearTranscriptTables() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {//clear transcript courses before transcript main
            db.run("DELETE FROM TranscriptCourses", err => {
                if (err) return reject(err);

                db.run("DELETE FROM Transcript", err => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        });
    });
}

module.exports = { db, clearTranscriptTables };//export functions and database