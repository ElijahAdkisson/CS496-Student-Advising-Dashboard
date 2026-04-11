//ADDS COURSES TO THE DATABASE FROM THE OUTPUT OF REQUIREMENTSHTMLPARSER.JS
//WRITTEN BY FREDDY GOODWIN ASSISTED BY CHATGPT

//NOT CONNECTED TO THE MAIN SERVER FILE, RUNS ISOLATED IN CMD FOR TESTING PURPOSES

const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const inputFile = process.argv[2];

if (!inputFile) {
  console.error("Usage: node parser.js <file.txt>");
  process.exit(1);
}

const db = new sqlite3.Database("database.db");

const text = fs.readFileSync(inputFile, "utf-8");
const lines = text.split(/\r?\n/);

let major = null;
let tableNum = 0;

let data = {//
  major: null,
  blocks: []
};

let currentBlock = null;//blocks are the individual subtables that are on the webpage and parsed readout
//i used them to determine what courses are electives vs requirements

function isTable(line) {//parser denotes tables in its output with a table header
  return /^Table\s+\d+/i.test(line);
}

function isCourse(line) {//looks for stuff like "CS180"
  return /[A-Z]{2,4}\s?\d{3}/.test(line);
}

function extractCourse(line) {//pulls a course number from the line its in
  const match = line.match(/([A-Z]{2,4}\s?\d{3})/);
  return match ? match[1] : null;
}

function isSelectLine(line) {//elective tables are denoted on the website by being able to select courses out of a group
  return /select\s+\w+\s+of\s+the\s+following/i.test(line); //this looks for lines like that
}

function isSectionHeader(line) {//determines if a line is a header based on if it doesnt have a course or say something like "table 1"
  return (
    !isCourse(line) &&
    !isTable(line) &&
    !line.includes("http") && //the parser also grabs hrefs so that was helpful
    line.trim().length > 0
  );
}

//this is the part where it reads through the file
for (let i = 0; i < lines.length; i++) {
  let line = lines[i].trim();
  if (!line) continue;

//grabs the major from the top
  if (line.startsWith("Major:")) {
    major = line.replace("Major:", "").trim();
    data.major = major;

    //insert program into db
    db.run(`INSERT INTO Programs (Program) VALUES (?)`, [major]);
    continue;
  }

  //if a line denoting a new table is hit, reset everything
  if (isTable(line)) {
    tableNum++;
    currentBlock = null;
    continue;
  }

  //if the line has "select two of the following" or something, its an elective group
  if (isSelectLine(line)) {
    currentBlock = {
      table: tableNum,
      title: line,
      type: "elective",
      courses: []
    };

    data.blocks.push(currentBlock);
    continue;
  }

  //looks for subtable labels like "required courses" or "low level electives" 
  if (isSectionHeader(line) && !isCourse(line)) {

    if (/total hours/i.test(line)) continue;//some lines tell you how many total hours are in a table which isnt important

    //set the block to the right one if detected
    currentBlock = {
      table: tableNum,
      title: line,
      type: /elective/i.test(line) ? "elective" : "required",
      courses: []
    };

    data.blocks.push(currentBlock);
    continue;
  }

  // if the line has a course in it
  if (isCourse(line)) {
    const course = extractCourse(line);
    if (!course) continue;

    //if no block exists yet
    if (!currentBlock) {
      currentBlock = {
        table: tableNum,
        title: "Uncategorized",
        type: "required",
        courses: []
      };
      data.blocks.push(currentBlock);
    }

    currentBlock.courses.push(course);
  }
}

//put them in the database
for (const block of data.blocks) {
  for (const course of block.courses) {
    if (block.type === "elective") {
      db.run(
        `INSERT INTO ProgramElects (CourseNum, Program) VALUES (?, ?)`,
        [course, data.major]
      );
    } else {
      db.run(
        `INSERT INTO ProgramReqs (CourseNum, Program) VALUES (?, ?)`,
        [course, data.major]
      );
    }
  }
}

db.close(() => {
  console.log("Courses inserted");
});