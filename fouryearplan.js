//GENERATES FOUR YEAR PLAN BASED ON DATABASE DATA FROM TRANSCRIPTS, MAJOR, AND COLONNADE
//WRITTEN BY FREDDY GOODWIN

//integrated with server

const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database("database.db");
const { generateKeySync } = require("crypto");
const fs = require("fs");


async function generatePlan(major, transcript, sixCourse, summer, winter) {//this is called by the server
    try {
        const result = await fouryearplan(
            major,
            transcript,
            sixCourse,
            summer,
            winter
        );

        fs.writeFileSync(//write to fouryearplan.json
            "fouryearplan.json",
            JSON.stringify(result, null, 2)
        );
        return result;

    } catch (err) {
        console.error("Error generating four year plan:", err);
    }
}

//generatePlan();




//fouryearplan("Computer Science", true, false, false, false);
async function fouryearplan(major, transcript, sixCourse, summer, winter) {
    let winterSeasons = false;
    let summerSeasons = false;
    if(major === undefined){
        major = "Computer Science";
    }
    if (transcript === undefined){
        transcript = false;
    }
    if (summer === undefined){
        summerSeasons = false;
    }else{
        summerSeasons=summer;
    }
    if (winter === undefined){
        winterSeasons = false;
    }else{
        winterSeasons=winter;
    }
    


    let entryMath = false;
    let entryEng = false;
    let writing300 = false;
    let entryComm = false;
    let litStudies = false;
    let entryHist = false
    let humanities = false;
    let socialSci = false;
    let natPhysSci1 = false; //take 2
    let natPhysSci2 = false;
    let cultConn = false; //junior status
    let localGlobal = false; //junior
    let systems = false;
    
    let worldLanguage1 = false; //must be before 60 credits, 2 parts
    let worldLanguage2 = false;
    

    let entryMathQueue = false;
    let entryEngQueue = false;
    let writing300Queue = false;
    let entryCommQueue = false;
    let litStudiesQueue = false;
    let entryHistQueue = false
    let humanitiesQueue = false;
    let socialSciQueue = false;
    let natPhysSci1Queue = false;
    let natPhysSci2Queue = false; //take 2
    let cultConnQueue = false; //junior status
    let localGlobalQueue = false; //junior
    let systemsQueue = false;
    
    let worldLanguage1Queue = false;
    let worldLanguage2Queue = false; //must be before 60 credits, 2 parts


    
    let juniorStatus = false;
    let connectionsReady = false;

    let semesterCourses = 5; //this can be changed to six 
    if(sixCourse){
        semesterCourses = 6;
    }
    let currentSeason = "Fall";

    
    const colonnade = await getColonnade();
    //console.log(colonnade);
    
    const transcriptCourses = new Set();
    const semesters = {};
    let semesterCount = 1;
    let totalCredits = 0;
    let genElectCount = 0;
    const takenCourses = new Set();
    if(transcript){//if a transcript was uploaded, it will already be in the database
        
        const takenCourses = await getTranscriptCourses();
        //console.log("taken");
        console.log(takenCourses);
        //console.log("takenCourses");
        const res = await getTranscriptData();
        totalCredits = res.CreditHours;
        console.log(totalCredits);
        if (res.SemestersNum % 2 !== 0) {//if theyve taken an odd number of semesters it should be spring
            currentSeason = "Spring";
        }
        let scitriggered = false;
        let langtriggered = false;
        for(const course of takenCourses){//removes requirements if they are already taken
            
            if(course === "ENG 100"){
                //console.log(`${course} verified as entry english`);
                entryEng = true;
                continue;
            }
            if(course === "ENG 200" || course === "MLNG 200" || course === "RELS 200"){
                litStudies = true;
                //console.log(`${course} verified as 200 level eng`);
                continue;
            }
            if(course === "COMM 200" || course === "GEOG 300" || course === "PSYS 300" || course === "ENG 300"){
                writing300 = true;
                //console.log(`${course} verified as 300 level eng`);
                continue;
            }
            if(course === "COMM 145"){
                entryComm = true;
                //console.log(`${course} verified as communicaiton`);
                continue;
            }
            if(course === "HIST 101" || course === "HIST 102"){
                entryHist = true;
                //console.log(`${course} verified as history`);
                continue;
            }
            if(colonnade["Quantitative Reasoning"].has(course)){
                entryMath = true;
                //console.log(`${course} verified as quant reason`);
                continue;
            }
            if(colonnade["Arts & Humanities"].has(course)){
                humanities = true;
                //console.log(`${course} verified as arts and human`);
                continue;
            }
            if(colonnade["Social & Behavioral Sciences"].has(course)){
                socialSci = true;
                //console.log(`${course} verified as soc behav sci`);
                continue;
            }
            if(colonnade["Natural & Physical Sciences"].has(course) && !scitriggered){
                natPhysSci1 = true;
                //console.log(`${course} verified as nat phys sci 1`);
                scitriggered = true;
                continue;
            }
            if(colonnade["Natural & Physical Sciences"].has(course)){
                natPhysSci2 = true;
                //console.log(`${course} verified as nat phys sci 2`);
                continue;
            }
            if(colonnade["Social & Cultural"].has(course)){
                cultConn = true;
                //console.log(`${course} verified as soc cult`);
                continue;
            }
            if(colonnade["Local to Global"].has(course)){
                localGlobal = true;
                //console.log(`${course} verified as localglobal`);
                continue;
            }
            if(colonnade["Systems"].has(course)){
                systems = true;
                //console.log(`${course} verified as systems`);
                continue;
            }
            if(colonnade["World Language Proficiency"].has(course) && !langtriggered){
                worldLanguage1 = true;
                //console.log(`${course} verified as world lang 1`);
                langtriggered = true;
                continue;
            }
            if(colonnade["World Language Proficiency"].has(course)){
                worldLanguage2 = true;
                //console.log(`${course} verified as world lang 2`);
                continue;
            }

        }
    }
    
    const requirements = await getRequirements(major);
    //console.log(requirements);
    
    let litStudiesCourse = "ENG 200";
    let writing300Course = "ENG 300";
    let humanitiesCourse = "ART 100";
    let socialSciCourse = "GEOG 110";
    let natPhysSci1Course = "CHEM 120";
    scitriggered = false;
    let natPhysSci2Course = "PHYS 103";


    for(const group in requirements){//
        for(const course of requirements[group]){
            if(course === "MLNG 200" || course === "RELS 200"){
                litStudiesCourse = course;
                continue;
            }
            if(course === "COMM 200" || course === "GEOG 300" || course === "PSYS 300"){
                writing300Course = course;
                continue;
            }
            if(colonnade["Arts & Humanities"].has(course)){
                humanitiesCourse = course;
                continue;
            }
            if(colonnade["Social & Behavioral Sciences"].has(course)){
                socialSciCourse = course;
                continue;
            }
            if(colonnade["Natural & Physical Sciences"].has(course) && !scitriggered){
                natPhysSci1Course = course;
                scitriggered = true;
                continue;
            }
            if(colonnade["Natural & Physical Sciences"].has(course)){
                natPhysSci2Course = course;
                continue;
            }

        }
    }

    const groupLimit = {};


    for (const groupName in requirements) {//this is a convoluted way of keeping track of elective counts
        for(const course of requirements[groupName]){//for every course in the group
            //the last character of each course group was added as a "course" so that elective count would be retained
            if(isNumber(course)){
                groupLimit[groupName] = Number(course);
                break;
            }else{
                groupLimit[groupName] = "X";
            }
        }
    }

    const groupCount = {};

    semesters[semesterCount] = {
        season: currentSeason,
        courses: new Set()
    };//creates the first semester chunk

    //HARDCODED COURSES FOR THOSE WITH NO TRANSCRIPT
    if(!transcript){
        takenCourses.add("MATH 116");//this isnt on the official finish in four and i didnt ever take it but for some reason its technically required
        //so we're cheating that one
        takenCourses.add("MATH 117");//hardcode math117, because its a prereq that is taken alongside things for people who couldn't automatically get into math 136
        entryMath = true;
        console.log(`MATH 117 added to semester ${semesterCount}`);
        
        semesters[1].courses.add("MATH 117")
    }

    while (semesterCount < 10){//this loop will be broken so 10 is just a failsafe
        
        
        while (semesters[semesterCount].courses.size < semesterCourses){//while a course can fit in the semester
            
            entryMathQueue = false;
            entryEngQueue = false;
            writing300Queue = false;
            entryCommQueue = false;
            litStudiesQueue = false;
            entryHistQueue = false
            humanitiesQueue = false;
            socialSciQueue = false;
            natPhysSci1Queue = false;
            natPhysSci2Queue = false; //take 2
            cultConnQueue = false; //junior status
            localGlobalQueue = false; //junior
            systemsQueue = false;
            worldLanguage1Queue = false;
            worldLanguage2Queue = false; //must be before 60 credits, 2 parts
            if(semesterCount > 3){
                juniorStatus = true;
            }
            if ([entryMath,entryEng,writing300,entryComm,litStudies,entryHist,humanities,socialSci,natPhysSci1,natPhysSci2].reduce((sum, val) => sum + val, 0) >= 7) {
                connectionsReady = true;//if they have enough of the foundations and connections done, it will be over 20 credits
            }
            console.log(currentSeason);

            for (const groupName in requirements) {//for every group in the major requirements
                
                if (!groupCount[groupName]) {
                    groupCount[groupName] = 0;
                }
                

                for(const course of requirements[groupName]){//for every course in the group

                    const limit = fixLimit(groupLimit[groupName]);//elective limits are stored as nums or "X"
                    if (groupCount[groupName] >= limit){
                        continue;
                    }

                    if(isNumber(course)){//skip this "course" if it isnt a course
                        continue;
                    }
                    //if it hasnt been taken before and is available this semester and hasnt been added to this semester and the semester has space
                    if(!takenCourses.has(course) && await isAvailableCourse(course, currentSeason, takenCourses) && !semesters[semesterCount].courses.has(course) && semesters[semesterCount].courses.size < semesterCourses){
                        
                        semesters[semesterCount].courses.add(course);
                        
                        console.log(`${course} added to semester ${semesterCount}`);
                        groupCount[groupName]++;

                        //these check if it meets colonnade requirements too                        
                        if(course === "ENG 200"||course === "MLNG 200" ||course === "RELS 200"){
                            litStudiesQueue = true;
                            
                        }
                        if(course=== "ENG 300" || course === "COMM 200" || course === "GEOG 300" || course === "PSYS 300"){
                            writing300Queue = true;
                            
                        }
                        if(colonnade["Arts & Humanities"].has(course)){
                            humanitiesQueue = true;
                            
                        }
                        if(colonnade["Social & Behavioral Sciences"].has(course)){
                            socialSciQueue = true;
                            
                        }
                        if(colonnade["Natural & Physical Sciences"].has(course) && natPhysSci2 === false){
                            natPhysSci1Queue = true;
                            
                        }
                        if(colonnade["Natural & Physical Sciences"].has(course) && natPhysSci1 === true){
                            natPhysSci2Queue = true;
                            
                        }


                        if(semesters[semesterCount].courses.size === semesterCourses){
                            break;
                        }
                    }else{//if the huge check fails
                        
                        
                    }
                    if(semesters[semesterCount].courses.size === semesterCourses){
                        break;
                    }
                    
                }
                

            }

            if(await isAvailableCourse("ENG 100", currentSeason, takenCourses) && !entryEng && !entryEngQueue && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add("ENG 100");
                entryEngQueue = true;
                console.log(`ENG 100 added to semester ${semesterCount}`);
                if(semesters[semesterCount].courses.size === semesterCourses){
                    break;
                }
                
            }
            if(await isAvailableCourse("SPAN 101", currentSeason, takenCourses) && !worldLanguage1 && !worldLanguage1Queue && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add("WORLD LANGUAGE FIRST COURSE");
                worldLanguage1Queue = true;
                console.log(`WORLD LANGUAGE FIRST COURSE added to semester ${semesterCount}`);
                if(semesters[semesterCount].courses.size === semesterCourses){
                    break;
                }
                
            }
            
            if(await isAvailableCourse("SPAN 102", currentSeason, takenCourses) && !worldLanguage2 && !worldLanguage2Queue && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add("WORLD LANGUAGE SECOND COURSE");
                worldLanguage2Queue = true;
                console.log(`WORLD LANGUAGE SECOND COURSE added to semester ${semesterCount}`);
                if(semesters[semesterCount].courses.size === semesterCourses){
                    break;
                }
                
            }
            if(await isAvailableCourse("COMM 145", currentSeason, takenCourses) && !entryComm && !entryCommQueue && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add("COMM 145");
                entryCommQueue = true;
                console.log(`COMM 145 added to semester ${semesterCount}`);
                if(semesters[semesterCount].courses.size === semesterCourses){
                    break;
                }
                
            }
            if(await isAvailableCourse(writing300Course, currentSeason, takenCourses) && !writing300 && !writing300Queue && !takenCourses.has(writing300Course) && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add(writing300Course);
                writing300Queue = true;
                console.log(`${writing300Course} added to semester ${semesterCount}`);
                if(semesters[semesterCount].courses.size === semesterCourses){
                    break;
                }
                
            }
            if(await isAvailableCourse(litStudiesCourse, currentSeason, takenCourses) && !litStudies && !litStudiesQueue && !takenCourses.has(litStudiesCourse) && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add(litStudiesCourse);
                litStudiesQueue = true;
                console.log(`${litStudiesCourse} added to semester ${semesterCount}`);
                if(semesters[semesterCount].courses.size === semesterCourses){
                    break;
                }
                
            }
            if(await isAvailableCourse("HIST 102", currentSeason, takenCourses) && !entryHist && !entryHistQueue && !takenCourses.has("HIST 102") && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add("HIST 101/102");
                entryHistQueue = true;
                console.log(`HIST 101/102 added to semester ${semesterCount}`);
                if(semesters[semesterCount].courses.size === semesterCourses){
                    break;
                }
                
            }
            if(await isAvailableCourse(humanitiesCourse, currentSeason, takenCourses) && !humanities && !humanitiesQueue && !takenCourses.has(humanitiesCourse) && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add("ARTS & HUMANITIES ELECTIVE");
                humanitiesQueue = true;
                console.log(`ARTS & HUMANITIES ELECTIVE added to semester ${semesterCount}`);
                if(semesters[semesterCount].courses.size === semesterCourses){
                    break;
                }
                
            }
            if(await isAvailableCourse(socialSciCourse, currentSeason, takenCourses) && !socialSci && !socialSciQueue && !takenCourses.has(socialSciCourse) && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add("SOCIAL & BEHAVIORAL SCIENCES ELECTIVE");
                socialSciQueue = true;
                console.log(`SOCIAL & BEHAVIORAL SCIENCES ELECTIVE added to semester ${semesterCount}`);
                if(semesters[semesterCount].courses.size === semesterCourses){
                    break;
                }
                
            }
            if(await isAvailableCourse(natPhysSci1Course, currentSeason, takenCourses) && !natPhysSci1 && !natPhysSci1Queue && !takenCourses.has(natPhysSci1Course) && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add("NATURAL & PHYSICAL SCIENCES ELECTIVE 1");
                natPhysSci1Queue = true;
                console.log(`NATURAL & PHYSICAL SCIENCES ELECTIVE added to semester ${semesterCount}`);
                if(semesters[semesterCount].size === semesterCourses){
                    break;
                }
                
            }
            if(await isAvailableCourse(natPhysSci2Course, currentSeason, takenCourses) && !natPhysSci2 && !natPhysSci2Queue && !takenCourses.has(natPhysSci2Course) && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add("NATURAL & PHYSICAL SCIENCES ELECTIVE 2");
                natPhysSci2Queue = true;
                console.log(`NATURAL & PHYSICAL SCIENCES ELECTIVE added to semester ${semesterCount}`);
                if(semesters[semesterCount].courses.size === semesterCourses){
                    break;
                }
                
            }
            if(await isAvailableCourse("MUS 320", currentSeason, takenCourses) && !cultConn && (juniorStatus || totalCredits > 20) && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add("SOCIAL & CULTURAL ELECTIVE");
                cultConnQueue = true;
                console.log(`SOCIAL & CULTURAL ELECTIVE added to semester ${semesterCount}`);
                if(semesters[semesterCount].courses.size === semesterCourses){
                    break;
                }
                
            }
            if(await isAvailableCourse("MUS 277", currentSeason, takenCourses) && !localGlobal && (juniorStatus || totalCredits > 20) && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add("LOCAL TO GLOBAL ELECTIVE");
                localGlobalQueue = true;
                console.log(`LOCAL TO GLOBAL ELECTIVE added to semester ${semesterCount}`);
                if(semesters[semesterCount].courses.size === semesterCourses){
                    break;
                }
                
            }
            if(await isAvailableCourse("GEOG 226", currentSeason, takenCourses) && !systems && (juniorStatus || totalCredits > 20) && semesters[semesterCount].courses.size < semesterCourses){
                semesters[semesterCount].courses.add("SYSTEMS ELECTIVE");
                systemsQueue = true;
                console.log(`SYSTEMS ELECTIVE added to semester ${semesterCount}`);
                if(semesters[semesterCount].courses.size === semesterCourses){
                    break;
                }
                
            }

            
            if(currentSeason==="Summer" || currentSeason==="Winter"){
                break;
            }
            while(semesters[semesterCount].courses.size < semesterCourses){
                //console.log(semesterCourses);
                //console.log(semesters[semesterCount].size);
                semesters[semesterCount].courses.add(`GENERAL ELECTIVE ${genElectCount}`);
                genElectCount++;
                console.log(`GENERAL ELECTIVE added to semester ${semesterCount}`);
            }
            
            
        }

        console.log("SEMESTER OVER");
        //console.log(takenCourses);
        for(const item of semesters[semesterCount].courses){//add the courses to the taken list so there isnt repeats and the prereqs are valid
            if(item === "WORLD LANGUAGE FIRST COURSE"){
                takenCourses.add("SPAN 101");
            }if(item === "WORLD LANGUAGE SECOND COURSE"){
                takenCourses.add("SPAN 102");
            }else{
                takenCourses.add(item);
            }
            
            totalCredits = totalCredits + await getCreditHours(item);
            console.log(totalCredits);
            //console.log(takenCourses);
            //console.log("fr fr");
        }
        //console.log(takenCourses);
        //console.log(semesters);

        if(entryEngQueue === true){
            //takenCourses.add("ENG 100");
            entryEng = true;
        }
        if(writing300Queue === true){
            //takenCourses.add(writing300Course);
            writing300 = true;
        }
        if(entryCommQueue === true){
            //takenCourses.add("COMM 145");
            entryComm = true;
        }
        if(litStudiesQueue === true){
            //takenCourses.add(litStudiesCourse);
            litStudies = true;
        }
        if(entryHistQueue === true){
            //takenCourses.add("HIST 102");
            entryHist = true;
        }
        if(humanitiesQueue === true){
            //takenCourses.add(humanitiesCourse);
            humanities = true;
        }
        if(socialSciQueue === true){
            //takenCourses.add(socialSciCourse);
            socialSci = true;
        }
        if(natPhysSci1Queue === true){
            //takenCourses.add(natPhysSci1Course);
            natPhysSci1 = true;
        }
        if(natPhysSci2Queue === true){
            //takenCourses.add(natPhysSci2Course);
            natPhysSci2 = true;
        }
        if(cultConnQueue === true){
            cultConn = true;
        }
        if(localGlobalQueue === true){
            localGlobal = true;
        }
        if(systemsQueue === true){
            systems = true;
        }
        if(worldLanguage1Queue === true){
            //takenCourses.add("SPAN 101");
            worldLanguage1 = true;
        }
        if(worldLanguage2Queue === true){
            //takenCourses.add("SPAN 102");
            worldLanguage2 = true;
        }
        semesterCount++;
        if(currentSeason === "Fall"){
            if(winterSeasons){
                currentSeason = "Winter";
            }else{
                currentSeason = "Spring";
            }
        }else if(currentSeason==="Winter"){
            currentSeason="Spring";
        }else if(currentSeason==="Spring"){
            if(summerSeasons){
                currentSeason = "Summer";
            }else{
                currentSeason = "Fall";
            }
        }else if(currentSeason = "Summer"){
            currentSeason = "Fall";
        }

        if (entryMath && entryEng && writing300 && entryComm && litStudies && entryHist && humanities && socialSci 
            && natPhysSci1 && natPhysSci2 && cultConn && localGlobal && systems && worldLanguage1 && worldLanguage2 && totalCredits > 119){

                break;
        }
        
        semesters[semesterCount] = {
            season: currentSeason,
            courses: new Set()
        };
        console.log("NEW SEMESTER");
  
    }
    console.log(semesters);
    return {
    semesters: Object.fromEntries(
        Object.entries(semesters).map(([sem, data]) => [
            sem,
            {
                season: data.season,
                courses: [...data.courses]
            }
        ])
    ),
    totalCredits,
    major
};

}


function getCourse(courseName) {//checks if a course is in the database
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT * FROM Courses WHERE CourseNum = ?`,
      [courseName],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
}

function getPrereqRows(courseName) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT ReqCourse FROM CourseReqs WHERE Course = ?`,
      [courseName],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

//original version of this function
//function satisfiesPrereqRow(reqString, takenCourses) {//checks to make sure the prereqs are taken already
  //const options = reqString.split(" OR ").map(s => s.trim());//prereqs with OR share a row
  //return options.some(course => takenCourses.has(course));
//}


function satisfiesPrereqRow(reqString, takenCourses) {//checks to make sure the prereqs are taken already
  let options = reqString.split(" OR ").map(s => s.trim());//prereqs with OR share a row

  const csCount = [...takenCourses].filter(c => c.includes("CS")).length;//checks if lots of CS courses are taken

  if (csCount > 3) {//ignores EE 380 if student is CS because of silly edge case with one of galloway's courses
    options = options.filter(course => course !== "EE 380");
  }

  if (options.length === 0) {
    return true;
  }
  

  if (options.includes("ENG 307") && !options.includes("ENG 300")) {//another edgecase on galloway's course requirements
    options.push("ENG 300");//it requires a writing 300 course or a technical writing course but is written in a way that tricks my parser
    
  }

  return options.some(course => takenCourses.has(course));
}

async function isAvailableCourse(courseName, season, takenCourses) {//returns true if the course is possible to take in the current semester
  
  
  //console.log(`isAvailable has been called on ${courseName}`);
  const course = await getCourse(courseName);//checks if the course exists, fetches its info
  if (!course){
    //console.log("course doesnt exist");
 
    return false;
  } 
  const juniorCourses = new Set(["ART 432", "CSJ 499"]);//junior-only
  //senior-only
  const seniorCourses = new Set(["ART 434", "DCS 400", "ENG 413", "ENG 414", "ENG 416", "EXS 498", "FILM 486", "IDST 495", "ARC 499", "BCOM 482", 
    "BE 486", "CRIM 499", "ECON 499", "ENGR 490", "HMD 459", "IA 497", "LS 495", "MGT 498", "PHIL 496", "POP 498", "RELS 496",]);

  if(takenCourses.size < 20 && juniorCourses.has(courseName)){
    
    return false;
  }
  if(takenCourses.size < 30 && seniorCourses.has(courseName)){
    
    return false;
  }

  
  const seasonMap = {
    fall: course.isFall,
    spring: course.isSpring,
    summer: course.isSummer,
    winter: course.isWinter
  };

  if (seasonMap[season.toLowerCase()] !== 1) {//checks if the course is available this season
    //console.log("not this season");
 
    return false;
  }

  const prereqRows = await getPrereqRows(courseName);
  

  if (prereqRows.length === 0){
    return true;
  } //if there are no prerequisites

  for (const row of prereqRows) {//checks that all relevant rows pass the prereqs
    

    if(courseName === row.ReqCourse){//ENG 100 has itself as a prereq for some reason
        return true;
    }
    const ok = satisfiesPrereqRow(row.ReqCourse, takenCourses);
    
    if (!ok) {
        
        //console.log("invalid prereq");

      return false; 
    }
  }//
  
  //console.log(`${courseName} added to semester`)

  return true;
}

function getRequirements(major) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT group_name, course 
       FROM requirements 
       WHERE program_name = ?`,
      [major],
      (err, rows) => {
        if (err) return reject(err);

        const requirements = {};

        for (const row of rows) {
          const group = row.group_name;

          if (!requirements[group]) {
            requirements[group] = new Set();

            const lastChar = group.slice(-1);
            requirements[group].add(lastChar);//takes the last character and adds it too
          }

          requirements[group].add(row.course);
        }

        resolve(requirements);
      }
    );
  });
}

function getColonnade() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT group_name, course 
       FROM colonnade 
       `,
      (err, rows) => {
        if (err) return reject(err);

        const colonnade = {};

        for (const row of rows) {
          const group = row.group_name;

          if (!colonnade[group]) {
            colonnade[group] = new Set();

          }

          colonnade[group].add(row.course);
        }

        resolve(colonnade);
      }
    );
  });
}

function getTranscriptCourses() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT CourseNum, Grade
       FROM TranscriptCourses`,
      (err, rows) => {
        if (err) return reject(err);

        const transcriptCourses = new Set();

        for (const row of rows) {
          if (!row.CourseNum || !row.Grade) continue;

          //skip failed courses
          if (row.Grade === "W" || row.Grade === "F") continue;

          //format ENG100 to ENG 100
          const cleaned = row.CourseNum.replace(/([A-Za-z]+)(\d+)/, "$1 $2");

          transcriptCourses.add(cleaned);
          
        }
        //console.log(transcriptCourses);
        resolve(transcriptCourses);
      }
    );
  });
}

function getTranscriptData() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT Program, CreditHours, SemestersNum
       FROM Transcript`,
      (err, row) => {
        if (err) return reject(err);

        if (!row) {
          return resolve(null);
        }

        resolve({
          Program: row.Program,
          CreditHours: row.CreditHours,
          SemestersNum: row.SemestersNum
        });
      }
    );
  });
}

function isNumber(str) {//checks if a string is a number
  return typeof str === 'string' && /^-?\d+(\.\d+)?$/.test(str.trim());
}
function fixLimit(limit) {
    return limit === "X" ? Infinity : Number(limit);
}

function getCreditHours(course) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT CreditHours 
       FROM Courses 
       WHERE CourseNum = ?`,
      (err, rows) => {
        if (err) return resolve(3);

        if (!rows || rows.length === 0) {
          return resolve(3); 
        }
        
        resolve(rows[0].CreditHours);

      }
    );
  });
}
module.exports = {
  fouryearplan,
  generatePlan
};