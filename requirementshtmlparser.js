//WKU REQUIREMENTS PAGE PARSER
//WRITTEN BY FREDDY GOODWIN ASSISTED BY CHATGPT

//NOT CONNECTED TO THE MAIN SERVER FILE YET, JUST WANTED IT TO WORK FIRST

const fs = require("fs");
const cheerio = require("cheerio");//library for parsing html, primarily what chatGPT was used for

//the args given in the command line correspond to the input and output
const inputFile = process.argv[2];
const outputFile = process.argv[3] || "output.txt";

if (!inputFile) {//user didnt put any args
    console.error("Usage: node parser.js <input.html> [output.txt]");
    process.exit(1);
}

//this depends on the user having the html file local on their machine already
//the html files will come from the scraper, but i havent made that yet so i just downloaded one html file for testing
const html = fs.readFileSync(inputFile, "utf-8");

//load cheerio
//this lets me use $ to access html tags like objects rather than making a big regex parser for the raw html
const $ = cheerio.load(html);

//all the course requirements are in tables labelled sc_courselist
const tables = $("table.sc_courselist");

let output = "";

tables.each((i, table) => {
    output += `Table ${i + 1}\n`;//labelled headers in the output

    $(table).find("tr").each((j, row) => {//finds each row in the table, then every cell in the row
        const cells = $(row).find("th, td");

        const rowData = [];

        //saves all of the text of each cell in a row one by one
        cells.each((k, cell) => {
            let text = $(cell).text().trim();
            text = text.replace(/\s+/g, " ");//it also trims off all the blank space
            rowData.push(text);//print to output
        });

        //saves all of the href links in the row
        //i'll need to make another html parser later that fetches each course's prerequisites
        //that parser will need these links to get that data
        const links = [];
        $(row).find("a").each((k, link) => {
            const href = $(link).attr("href");
            if (href) {
                links.push(href.trim());//save links to links table
            }
        });

        //if there are links, print them to the output
        if (links.length > 0) {
            rowData.push(links.join(", "));
        } else {
            rowData.push(""); 
        }

        if (rowData.length > 0) {
            output += rowData.join("\t") + "\n";//puts a tab space between each item for legibility
        }
    });

    output += "\n";//new line for legibility
});

//write to output
fs.writeFileSync(outputFile, output, "utf-8");

console.log(`Extracted ${tables.length} table(s) to ${outputFile}`);