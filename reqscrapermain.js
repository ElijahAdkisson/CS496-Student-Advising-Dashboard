const { deleteProgramReqs, clearTranscriptTables, db } = require("./dbUtils"); //import database interface JS calls and database
const { reqHTMLParser } = require("./requirementshtmlparser");//import requirements parser
const { parseRequirementsFile } = require("./requirementsDB");//import requirements database writer
const {
  parseCourses,
  parseFile,
  parsePrerequisites,
  extractCourse,
  extractCreditHours,
  extractTerms
} = require("./prereqparser");//import prerequisite parser
const {
  importCourses,
  processPrereqs,
  maxGrade,
  getTermFlags
} = require("./prereqDB.js");//import prerequisite writer
const { prereqMain } = require("./prereqmain");//import prerequisite handler
const { fetchHTML } = require("./fetchhtml");



//const inputLink = process.argv[2]; //remove this when integrating into server
//requirementScraper(inputLink);



async function requirementScraper(inputLink) {//main function
    const htmlFile = "scrapedHTML.html";
    const parsedFile = "parsedReqs.txt";
    await fetchHTML(checkURL(inputLink), htmlFile);
    const major = await reqHTMLParser(htmlFile, parsedFile);
    await deleteProgramReqs(major); //this deletes a major's requirements so the next line can redo them
    await parseRequirementsFile(parsedFile);
    await prereqMain(major);
    //db.close();
}

function checkURL(url) {//checks to make sure the url is pointing to the right part of the page
    const target = "programrequirementstext";

    if (url.includes("#")) {//user is on overview or finish in four
        const [base, hash] = url.split("#");

        if (hash === target) {
            return url;
        }

        return `${base}#${target}`;//replace with "#programrequirementstext"
    }

    let result = url;//user is on overview with no #

    if (!result.endsWith("/")) {//the urls should have this but its a precaution
        result += "/";
    }

    result += `#${target}`;//add "#programrequirementstext"

    return result;
}
module.exports = {
  requirementScraper
};