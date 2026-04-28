//PROCESSES HTML FILES INTO PROCESSED TEXT DOCUMENTS
//WRITTEN BY FREDDY GOODWIN ASSISTED BY CHATGPT

//NOT CONNECTED TO THE MAIN SERVER FILE, RUNS ISOLATED IN CMD FOR TESTING PURPOSES

const fs = require("fs");
const cheerio = require("cheerio");

//const inputFile = process.argv[2];
//const outputFile = process.argv[3] || "output.txt";

//if (!inputFile) {
//    console.error("Usage: node requirementshtmlparser.js <input.html> [output.txt]");
//    process.exit(1);
//}

async function reqHTMLParser(inputFile, outputFile = "output.txt"){
    const html = fs.readFileSync(inputFile, "utf-8");

    const $ = cheerio.load(html);


    $('[aria-labelledby="texttab"]').remove(); //the cs major had hidden h3 tags in the overview that made the parser not work
    $('[aria-labelledby="finishinfourtexttab"]').remove();
    //this removes the overview and finishinfour sections

    let concentrations = false;//some pages have different concentrations
    concentrations = /\b(concentration|option)\b/.test($("body").text().toLowerCase()); //looks for the word "concentration" and returns bools
    //also looks for "option" because thats what the math department calls it

    //get major title from the page and gets rid of the bachelor's degree after
    let major = $("h1.page-title").first().text().trim();
    if (major.includes(",")) {
        major = major.split(",")[0].trim();
    }

    let output = "";

    if (major) {
        output += `Major: ${major}\n\n`;
    }

    //tracks how many h3 tags and concentrations are seen
    //we only need one concentration
    let h3Count = 0;
    let currentConcentration = false;
    let concentrationCount = 0;
    let tableIndex = 0;

    //go through the HTML with cheerio, which is what i used chatgpt for
    $("body").find("*").each((i, el) => {
        const tag = el.tagName;
        currentConcentration = false;

        if (!concentrations && tag === "h3") {//if there are no concentrations, handle h3s like areaheaders
            const txt = $(el).text().trim();

            if (txt) {
                //replace h3 with bold text
                output += `**${txt}**\n\n`;
            }

            return;
        }

        //count h3 tags
        if (concentrations && tag === "h3") {
            h3Count++;
            console.log(`h3 ${h3Count} found.`);
            if (/\b(concentration|option)\b/.test($(el).text().toLowerCase())) {//if the h3 contains the word "concentration"
                currentConcentration = true;
                concentrationCount++;
            }
            
            if(h3Count >= 2 && currentConcentration && concentrationCount === 1){
                //lets it read the first instance of a concentration
            } else if(h3Count >= 2 && concentrationCount === 0){
                //if its going through tables and hasn't hit a concentration yet
            }
            else if (h3Count >= 2) {
                return false; //stop if enough h3s are found
            }
            if(concentrationCount > 2){//if it ever moves onto another concentration
                return false;
            }
        }


        
        
        
        //process all table elements
        if ($(el).is("table.sc_courselist")) {//they all have this html class, very handy
            
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
    return major;
}
module.exports = { reqHTMLParser };