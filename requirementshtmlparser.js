//ADDS COURSES TO THE DATABASE FROM THE OUTPUT OF REQUIREMENTSHTMLPARSER.JS
//WRITTEN BY FREDDY GOODWIN ASSISTED BY CHATGPT

//NOT CONNECTED TO THE MAIN SERVER FILE, RUNS ISOLATED IN CMD FOR TESTING PURPOSES

const fs = require("fs");
const cheerio = require("cheerio");

const inputFile = process.argv[2];
const outputFile = process.argv[3] || "output.txt";

if (!inputFile) {
    console.error("Usage: node requirementshtmlparser.js <input.html> [output.txt]");
    process.exit(1);
}

const html = fs.readFileSync(inputFile, "utf-8");

const $ = cheerio.load(html);

$('[aria-hidden="true"]').remove(); //the cs major had hidden h3 tags that made the parser not work
//this removes the hidden sections

//get major title from the page and gets rid of the bachelor's degree after
let major = $("h1.page-title").first().text().trim();
if (major.includes(",")) {
    major = major.split(",")[0].trim();
}

let output = "";

if (major) {
    output += `Major: ${major}\n\n`;
}

//tracks how many h3 tags seen
//other concentrations appear after a certain number of h3 tags, which i dont need
let h3Count = 0;
let tableIndex = 0;

//go through the HTML with cheerio, which is what i used chatgpt for
$("body").find("*").each((i, el) => {
    const tag = el.tagName;

    //count h3 tags
    if (tag === "h3") {
        console.log(`h3 found.`);
        h3Count++;
        if (h3Count >= 2) {
            return false; //stop if enough h3s are found
        }
    }

    //process all table elements
    if (tag === "table" && $(el).hasClass("sc_courselist")) {//they all have this html class, very handy
        tableIndex++;
        output += `Table ${tableIndex}\n`;

        $(el).find("tr").each((j, row) => {//extracts the data out of the table cells
            const cells = $(row).find("th, td");
            const rowData = [];

            
            cells.each((k, cell) => {

                //wrap areaheader spans with **
                //they are bold on the webpage and seperate different sections which is important
                $(cell).find('span.courselistcomment.areaheader').each((i, span) => {
                    const txt = $(span).text().trim();
                    $(span).replaceWith(`**${txt}**`);
                });

                let text = $(cell).text().trim();
                text = text.replace(/\s+/g, " ");
                rowData.push(text);
            });

            //grab hrefs, also important for the prereq info
            const links = [];
            $(row).find("a").each((k, link) => {
                const href = $(link).attr("href");
                if (href) {
                    links.push(href.trim());
                }
            });

            //add links
            rowData.push(links.length > 0 ? links.join(", ") : "");

            if (rowData.length > 0) {
                output += rowData.join("\t") + "\n";
            }
        });

        output += "\n";
    }
});

//write output
fs.writeFileSync(outputFile, output, "utf-8");

console.log(`Extracted ${tableIndex} table(s) to ${outputFile}`);