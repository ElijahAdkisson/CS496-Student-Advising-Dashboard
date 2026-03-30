//CS496 PARSER FILE
//WRITTEN BY FREDDY GOODWIN

//requirement imports copied from main file
const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require("multer");
const { clearTranscriptTables, db } = require("./dbUtils");//import database interface JS calls

//exports the parser's functions so the server can use them
module.exports = {
    parseTranscript
    
};

//the actual parser
//will be rewritten in the future to handle the real unofficial transcripts
//this is just for thursday's demo
function parseTranscript(content) {
    return new Promise((resolve, reject) => {
        try {//clean the data
            const lines = content
                .split("\n")
                .map(l => l.trim())
                .filter(l => l.length > 0);

            //hardcoded format lines
            const program = lines[2];
            const creditHours = parseInt(lines[4]);
            const semesters = parseInt(lines[6]);

            //determine where course data starts
            const courseStartIndex = lines.findIndex(line =>
                line.includes("[COURSEID,LETTERGRADE]")
            );

            const courseLines = lines.slice(courseStartIndex + 1);

            //read and record course and grade
            const courses = courseLines.map(line => {
                const [courseNum, grade] = line.split(",");
                return {
                    courseNum: courseNum.trim(),
                    grade: grade.trim()
                };
            });

            //CLEAR TABLES FIRST
            clearTranscriptTables(db)
                .then(() => {
                    db.run(//insert data into transcript table
                        `INSERT INTO Transcript (Program, CreditHours, SemestersNum)
                         VALUES (?, ?, ?)`,
                        [program, creditHours, semesters],
                        function (err) {//error catch
                            if (err) return reject(err);

                            const transcriptId = this.lastID;
                            
                            const stmt = db.prepare(//prepares the courses table to be inserted in
                                `INSERT INTO TranscriptCourses (TranscriptID, CourseNum, Grade)
                                 VALUES (?, ?, ?)`
                            );

                            for (let c of courses) {//for loop for inserting into the courses table
                                stmt.run(transcriptId, c.courseNum, c.grade);
                            }

                            stmt.finalize(err => {//error catch
                                if (err) return reject(err);

                                resolve({
                                    transcriptId,
                                    courseCount: courses.length
                                });
                            });
                        }
                    );
                })
                .catch(reject);

        } catch (err) {
            reject(err);
        }
    });
};



