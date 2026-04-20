//ADDS COURSES TO THE DATABASE FROM THE OUTPUT OF REQUIREMENTSHTMLPARSER.JS
//WRITTEN BY FREDDY GOODWIN ASSISTED BY CHATGPT (for the groups, mainly)
//NOT CONNECTED TO THE MAIN SERVER FILE, RUNS ISOLATED IN CMD FOR TESTING PURPOSES

const fs = require("fs");
const readline = require("readline");

const filePath = process.argv[2];

const sqlite3 = require("sqlite3").verbose();

function writeToSQLite(dbFile, major, groups) {//called at the end
    const db = new sqlite3.Database(dbFile);

    db.serialize(() => {
        db.run(`
            CREATE TABLE IF NOT EXISTS Programs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE
            )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS requirements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                program_name TEXT,
                group_name TEXT,
                course TEXT
            )
        `);

        db.run(
            `INSERT OR IGNORE INTO Programs (name) VALUES (?)`,
            [major]
        );

        const stmt = db.prepare(`
            INSERT INTO requirements (program_name, group_name, course)
            VALUES (?, ?, ?)
        `);//loops all of the course groups into the db

        for (const [groupName, courses] of Object.entries(groups)) {
            for (const course of courses) {
                stmt.run(major, groupName, course);
            }
        }

        stmt.finalize();
    });

    db.close();
}

if (!filePath) {//cmd error
    console.error("Usage: node reqDBtest.js <input-file>");
    process.exit(1);
}

const rl = readline.createInterface({//create the stream to get input line by line
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
});

let major = null;
let majorCaptured = false;

const groups = {};//arrays that will hold the different sections of the requirements tables
const tempGroups = {};

let baseSection = null;//the base requirements of each major
let activeGroup = null;//the current part of the requirements the code is in

const DEFAULT_GROUP = "Requirements";//had to add this because the applied stem majors were formatted stupidly

baseSection = DEFAULT_GROUP;
activeGroup = DEFAULT_GROUP;

tempGroups[DEFAULT_GROUP] = new Set();//creates the first group

const headerRegex = /^\*\*(.+?)\*\*$/;//the headers of most sections (minus stem majors) are bold
//i coded requirementshtmlparser.js to represent those sections with asterisks for easy sectioning
const courseRegex = /\b([A-Z]{2,5}\s\d{3})\b/g;//recognizes course codes like cs180

const selectRegex =//recognizes the lines that say "choose 3 electives"
  /\b(select|pick|choose|take)\s+(?:\w+|\d+)\b/i;

const numberMap = {//some of them are written, some are digits
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
};

const selectCountRegex =
    /\b(?:select|choose|pick|take)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d+)/i;

const wordMap = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    six: 6, seven: 7, eight: 8, nine: 9, ten: 10
};

function extractSelectCount(line) {//uses the maps to determine how many courses it says to pick from for the section
    const match = line.match(selectCountRegex);
    if (!match) return null;

    const val = match[1].toLowerCase();

    if (/^\d+$/.test(val)) return parseInt(val, 10);

    return wordMap[val] ?? null;
}

function ensureGroup(name) {
    if (!tempGroups[name]) tempGroups[name] = new Set();
    return name;
}


rl.on("line", (line) => {//runs per line read

    if (!majorCaptured) {//grabs the major from the top of the input
        const majorMatch = line.match(/^Major:\s*(.+)$/i);
        if (majorMatch) {
            major = majorMatch[1].trim();
            majorCaptured = true;
            return;
        }
    }

    line = line.trim();
    if (!line) return;//cuts the blanks

    const headerMatch = line.match(headerRegex);
    if (headerMatch) {//if a line with asterisks is found
        baseSection = headerMatch[1].trim();
        activeGroup = ensureGroup(baseSection);
        return;//makes a group with the line's name, sets that as the active group and goes to the next line
    }

    if (selectRegex.test(line)) {//if the line has "select four" or similar text
        let count = extractSelectCount(line);//get the number

        const isHours = /\bhours?\b/i.test(line);//if it has "hours" in it
        

        if (isHours && count) {
        count = Math.round(count / 3);
        }
        //had to add this because some of them say to select 12 credit hours rather than 4 courses
        //without it it would think you need 12 of the electives

        const derivedName =
        baseSection
            ? `${baseSection}_S${count}`
            : `${DEFAULT_GROUP}_S${count}`;

        activeGroup = ensureGroup(derivedName);//makes a new group with an adjusted name to signal that its a "pick number of" group
        //this will be important in the 4 year plan generator so it knows not to take every single course in this group
        return;
    }

    const matches = line.matchAll(courseRegex);//looks for course codes

    if (!activeGroup) {
        activeGroup = ensureGroup(DEFAULT_GROUP);
    }

    for (const m of matches) {//adds the current line's course to the list
        tempGroups[activeGroup].add(m[1]);
    }
});

rl.on("close", () => {//once there are no more lines
    for (const key in tempGroups) {
        groups[key] = Array.from(tempGroups[key]);
    }//turn the groups into arrays

    writeToSQLite("database.db", major, groups);//calls the database function

    console.log({//this was for debug
        major,
        groups
    });
});