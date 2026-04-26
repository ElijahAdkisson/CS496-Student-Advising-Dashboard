//UNOFFICIAL TRANSCRIPT PDF PARSER
//WRITTEN BY FREDDY GOODWIN ASSISTED BY CHATGPT

//REWORKED TO BE CALLED BY SERVER.JS
//CREDIT HOUR AND MAJOR COLLECTION ALSO ADDED

//requirements
const fs = require("fs");
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js"); //the library that allows PDFs to be processed
const { createCanvas } = require("canvas"); //the library that can turn PDFs in PNGs so tesseract can run
const Tesseract = require("tesseract.js"); //the library that lets us use optical character recognition to parse the transcript into text

//this function stardardizes characters and deletes blank areas so the readout is more accurate
function normalizeOCR(text) {
  return text
    //.replace(/[OØ]/g, '0')      //O to 0, commented this out because some course names have one or the other
    //.replace(/[lI|]/g, '1')     //L, I, | to 1, same as above
    .replace(/—/g, '-')         //em dash to hyphen
    .replace(/~/g, '-')          //tilde to hyphen
    .replace(/\|/g, '')          //remove stray pipes
    .replace(/[\u2018\u2019]/g, "'") //weird quotes to '
    .replace(/\s+/g, ' ')        //delete multiple spaces
    .trim();
}


//finds and records all the courses and letter grades on the transcript
//this is what parses the raw text into database data
function extractSubjectCourseGrade(text) {
  //this list is all (or most?) of the subjects offered at WKU
  //the parser searches for these keywords
  const validSubjects = new Set([
    "AH","ACMS","CMS","ACCT","ACTU","AD","ADPR","AFAM","AGEC","AGED","AGRI","AGSY",
    "ASL","ANSC","ANIM","ANTH","ABA","AS","ART","ASTR","BIOL","BDAS","BCOM","BA",
    "BDAN","CHEM","CHIN","CHNF","CSJ","CE","CHHS","COMM","CD","CIS","CS","CM","CNS",
    "CRIM","DANC","DATA","DH","DES","DPT","ECON","EDU","EDFN","EDLD","EE","ELED",
    "EMDS","ENGR","EM","ENG","ENT","EOHS","ENV","EXS","FACS","FILM","FIN","FOLK",
    "GWS","GISC","GEOG","GEOL","GEOS","GERO","GERM","GRED","HCA","HIM","HIST","HON",
    "HMD","IECE","IDST","IDFS","IA","JAPN","JOUR","LEAD","LS","LTCY","MGT","MFGE",
    "MKT","MATH","ME","METR","MGE","MIL","MUS","MLNG","NEUR","NURS","PERF","PHIL",
    "PETE","PE","PHYS","PLSS","PS","PCAL","PLS","PSYS","PSY","PH","PR","REC","RELS",
    "RUSS","SFTY","SEAS","SMC","SMED","SEC","SWRK","SOCL","SPAN","SPED","SLP","SPM",
    "STAT","THEA","UX","VJP","WFA"
  ]);

  const tokens = text //tokenizes and capitalizes the text so it matches the keywords
  .split(/\s+/)
  .map(t => t.toUpperCase());

  const table = [];
  let i = 0;

  while (i < tokens.length) {
    const subjectToken = tokens[i];

    if (validSubjects.has(subjectToken)) {//if the current token is in the keyword set
      let courseToken = null;
      let gradeToken = null;

      for (let j = i + 1; j < tokens.length; j++) {
        if (!courseToken && /^\d{3}$/.test(tokens[j])) {//find the next appearing course number like 180 or 496
          courseToken = tokens[j];
        } else if (courseToken && /^[A-FW]$/.test(tokens[j])) {//find the next appearing letter grade after finding the number
          gradeToken = tokens[j];
          i = j; //move pointer to after the grade
          break;
        }
      }

      if (courseToken && gradeToken) {
        table.push({
          subject: subjectToken,
          course: courseToken,
          grade: gradeToken
        });
      }
    }

    i++;
  }

  return table;
}

function extractMajor(text) {//finds the major
  const match = text.match(/Maj(?:or|o)\s+([A-Za-z\s]+?)(?:\s+Major\s+Concentration|\s+TRANSFER|\n|$)/i);

  if (match) {
    return match[1].trim();
  }

  return null;
}

function extractCreditHours(text) {//finds the credit hours
  const match = text.match(/Total\s+Institution\s+(\d+(\.\d+)?)/i);

  if (match) {
    return Math.floor(parseFloat(match[1])); // delete decimals
  }

  return 0;
}

//runs tesseract OCR on a pdf page to turn it into raw text
//this is mainly what chatGPT was used for, i had no idea how to parse a pdf or an image file
async function ocrPage(page) {
  const viewport = page.getViewport({ scale: 2 });//the source pdf, at 2x scale

  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");
  await page.render({ canvasContext: context, viewport }).promise;//renders the pdf onto a canvas
  const pngBuffer = canvas.toBuffer("image/png");//makes the canvas into a png file
  const { data: { text } } = await Tesseract.recognize(pngBuffer, "eng", {//run tesseract on the png
    logger: m => console.log(m.status, Math.round(m.progress * 100) + "%"),
  });

  return normalizeOCR(text);//clean and return result
}


async function processPDF(buffer) { //the main function where everything runs
  const data = new Uint8Array(buffer);//load the file
  const pdfDoc = await pdfjsLib.getDocument({ data }).promise;

  console.log(`PDF loaded. Total pages: ${pdfDoc.numPages}`);

  const allText = [];//the raw text as taken from the PDF with OCR
  const allTables = [];//the actual data we extract from the text

  let detectedMajor = null;
  let detectedCredits = 0;

  for (let i = 1; i <= pdfDoc.numPages; i++) {//run tesseract on each page one at a time
    console.log(`Processing page ${i}...`);
    const page = await pdfDoc.getPage(i);
    const text = await ocrPage(page);//run tesseract
    allText.push({ page: i, text });//dump the raw text

    // extract major once)
    if (!detectedMajor) {
      const major = extractMajor(text);
      if (major) detectedMajor = major;
    }

    // extract credit hours once
    if (!detectedCredits) {
      const credits = extractCreditHours(text);
      if (credits) detectedCredits = credits;
    }

    const trimmedText = trimAfterStudentInfo(text);//cut off the formatting at the top of the transcript
    const table = extractSubjectCourseGrade(trimmedText);//run the parser that gets all the courses
    if (table.length) allTables.push(...table);//dump the extracted courses
  }

  const result = {
    
    rawText: allText,
    table: allTables
  };

  fs.writeFileSync("output.json", JSON.stringify(result, null, 2), "utf8");//write the result to the file for testing purposes
  console.log("\nOCR complete. Structured table saved to output.json");

  return {
    table: allTables,
    major: detectedMajor,
    creditHours: detectedCredits
};
}

//runs on startup
//(async () => {
//  const pdfFile = process.argv[2];
//  if (!pdfFile) {//if user doesnt give an argument with the run command
//    console.error("Usage: node transcriptparser.js <file.pdf>");
//    process.exit(1);
//  }

//  try {//run the main function
//    await processPDF(pdfFile);
//  } catch (e) {
//    console.error("Error:", e);
//  }
//})();

//cuts the text at a certain point to remove the transcript formatting at the top
function trimAfterStudentInfo(text) {
  const match = text.match(/STUDENT\s+INFORMATION/i);

  if (match) {
    return text.slice(match.index + match[0].length);
  }

  return text;
}

module.exports = {
  processPDF
};