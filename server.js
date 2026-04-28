//CS496 MAIN SERVER FILE
//WRITTEN BY FREDDY GOODWIN, express middlemare security features made with ChatGPT

//requirement imports
const express = require('express');//RBAC
const session = require('express-session');//RBAC
const sqlite3 = require('sqlite3').verbose();//database
const bcrypt = require('bcrypt');//encryption
const path = require('path');//serving HTML
const multer = require("multer");//receiving files from frontend
const fs = require("fs");

//imports the functions of the other JS files
const { processPDF } = require("./transcriptparser");
const { clearTranscriptTables, db } = require("./dbUtils"); //import database interface JS calls and database
const { requirementScraper } = require("./reqscrapermain");
const { generatePlan } = require("./fouryearplan.js");
const app = express();

//stores temporary info in memory
//this is where the uploaded transcript is put before the information is sent to the database
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });
app.use(express.urlencoded({ extended: true }));

// session setup first
app.use(session({
    secret: 'encryptthisstringlater',
    resave: false,
    saveUninitialized: false
}));

//cache control
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});
//protection middleware
app.use((req, res, next) => {
    const protectedPages = [
        "/fouryearplan.html",
        "/transcript.html",
        "/advisorpanel.html"
    ];

    if (protectedPages.includes(req.path)) {
        if (!req.session.user) {
            return res.redirect('/');
        }
    }

    next();
});

// static files after auth
app.use(express.static(path.join(__dirname, "public")));
//login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

//executes when user logs in or makes a user on login.html
app.post('/auth', (req, res) => {
    const { username, password, action } = req.body;

    if (action === 'login') {//if user clicks login
        db.get('SELECT * FROM Users WHERE Username = ?', [username], (err, user) => {
            if (err) { //error catch
                console.error(err);
                return res.send('Database error <a href="/">Go back</a>');
            }

            if (!user) {//if user doesn't exist
                return res.send('User not found <a href="/">Go back</a>');
            }

            bcrypt.compare(password, user.Password, (err, result) => {
                if (err) { //error catch
                    console.error(err);
                    return res.send('User not found <a href="/">Go back</a>');
                }

                if (result) { //if successful
                    req.session.user = user.Username;
                    res.sendFile(path.join(__dirname, 'public', 'transcript.html'));
                } else { //if password is wrong
                    res.send('Invalid password. <a href="/">Go back</a>');
                    
                }
            });
        });

    } else if (action === 'register') {//if user clicks create user
        db.get('SELECT * FROM Users WHERE Username = ?', [username], (err, user) => {
            //check to make sure user doesnt already exist
            if (err) {//error catch
                console.error(err);
                return res.send('Database error <a href="/">Go back</a>');
            }

            if (user) {//user exists
                return res.send('User already exists <a href="/">Go back</a>');
            }

            bcrypt.hash(password, 10, (err, hash) => {//encrypt user password
                if (err) {//error catch
                    console.error(err);
                    return res.send('Error hashing password <a href="/">Go back</a>');
                }

                db.run(//insert data into database
                    'INSERT INTO Users (Username, Password) VALUES (?, ?)',
                    [username, hash],
                    (err) => {
                        if (err) {//error catch
                            console.error(err);
                            return res.send('Error creating user <a href="/">Go back</a>');
                        }

                        res.send('User created successfully! <a href="/">Go back</a>');
                    }
                );
            });
        });
    } else {
        res.send('Invalid action');
    }
});

//executes when an advisor hits delete user on the advisor panel
app.post('/deleteuser', (req, res) => {
    const { username, password, action } = req.body;
    db.get('SELECT * FROM Users WHERE Username = ?', [username], (err, user) => {
            if (err) {//error catch
                console.error(err);
                return res.json({ success: false, message: 'Database error' });
            }

            if (!user) {//nonexistent user
                return res.json({ success: false, message: 'User not found' });
            }

            if (username == req.session.user) {//catch to make sure user doesnt delete themself
                return res.json({ success: false, message: 'Cannot delete self' });
            }

            db.run('DELETE FROM Users WHERE username = ?', [username], function(err) {
                if (err) {//error catch
                    console.error(err.message);
                    return res.json({ success: false, message: 'Delete failed' });
                }
            return res.json({ success: true, message: 'User deleted' });
            })
        });
});

//executes when an advisor hits add advisor on the advisor panel
app.post('/addadvisor', (req, res) => {
    const { username, password, action } = req.body;
    db.get('SELECT * FROM Users WHERE Username = ?', [username], (err, user) => {
        //check to make sure user doesnt already exist
            if (err) {//error catch
                console.error(err);
                return res.send('Database error <a href="/advisorpanel">Go back</a>');
            }

            if (user) {//user exists
                return res.send('User already exists <a href="/advisorpanel">Go back</a>');
            }

            bcrypt.hash(password, 10, (err, hash) => {//encrypt user password
                if (err) {//error catch
                    console.error(err);
                    return res.send('Error hashing password <a href="/advisorpanel">Go back</a>');
                }
                db.run(//insert data into database
                    'INSERT INTO Users (Username, Password, IsAdvisor) VALUES (?, ?, ?)',
                    [username, hash, true],
                    (err) => {
                        if (err) {//error catch
                            console.error(err);
                            return res.send('Error creating user <a href="/advisorpanel">Go back</a>');
                        }

                        res.send('Advisor created successfully! <a href="/advisorpanel">Go back</a>');
                    }
                );
            });
        });

});




//called when a page needs the selected program info
app.get('/api/currentprogram', (req, res) => {
    res.json({ program: req.session.program || null });
});

//called when a page needs the current user's name
app.get('/api/currentuser', (req, res) => {
    res.json({ user: req.session.user || null });
});

//called when transcript link is input
app.get('/transcript', (req, res) => {
    if (!req.session.user) {//if there is no one logged in
        return res.redirect('/');
    }

    res.sendFile(path.join(__dirname, 'public', 'transcript.html'));
});

app.get('/fouryearplan', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/');
    }

    res.sendFile(path.join(__dirname, 'public', 'fouryearplan.html'));
});


//called when advisor panel link is input
app.get('/advisorpanel', (req, res) => {
    if (!req.session.user) {// If not logged in, send user to login
        return res.redirect('/');
    }

    res.sendFile(path.join(__dirname, 'public', 'advisorpanel.html'));
});

//forward file from transcript.html to its parser
app.post("/uploadtranscript", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send("No file uploaded");
        }

        if (req.file.mimetype !== "application/pdf") {
            return res.status(400).send("Only .pdf files are allowed");
        }

        // Parse PDF
        const result = await processPDF(req.file.buffer);

        // Clear old transcript data
        await clearTranscriptTables(db);

        // Validate extracted data
        const program = result.major || req.session.program || "UNDECLARED";
        const creditHours = result.creditHours || 0;
        const semesters = result.semesters || 0;

        if (!program) {
            return res.status(400).send("No program detected");
        }

        // Save session values
        req.session.program = result.major || req.session.program;
        req.session.hasTranscript = true;

        // Insert Transcript row
        const transcriptID = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO Transcript (Program, CreditHours, SemestersNum)
                 VALUES (?, ?, ?)`,
                [program, creditHours, semesters],
                function (err) {
                    if (err) return reject(err);
                    resolve(this.lastID);
                }
            );
        });

        // Insert courses
        for (const entry of result.table) {
            const courseNum = `${entry.subject}${entry.course}`;

            await new Promise((resolve, reject) => {
                db.run(
                    `INSERT INTO TranscriptCourses (TranscriptID, CourseNum, Grade)
                     VALUES (?, ?, ?)`,
                    [transcriptID, courseNum, entry.grade],
                    (err) => {
                        if (err) return reject(err);
                        resolve();
                    }
                );
            });
        }

        // Generate plan
        const plan = await generatePlan(program, true, false, false);

        console.log("PLAN RESULT:", plan);

        if (!plan) {
            return res.status(500).send("Failed to generate plan");
        }

        // Save session plan
        req.session.fourYearPlan = plan;

        // Write file ONCE
        const fs = require("fs");
        fs.writeFileSync(
            "./public/fouryearplan.json",
            JSON.stringify(plan, null, 2)
        );

        res.redirect("/fouryearplan?source=uploadtranscript");

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

app.get("/api/fouryearplan", (req, res) => {
    if (!req.session.fourYearPlan) {
        return res.status(404).json({ error: "No plan generated" });
    }

    res.json(req.session.fourYearPlan);
});

app.use(express.json());

app.post("/api/generate-plan", async (req, res) => {
    try {
        const { sixCourse, winter, summer } = req.body;

        const plan = await generatePlan(
            req.session.program,
            req.session.hasTranscript || false, // different input based on if a transcript is uploaded
            sixCourse,
            summer,
            winter
        );

        req.session.fourYearPlan = plan;

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate plan" });
    }
});

//reads out all courses and letter grades in the transcript
app.get("/api/transcript-courses", (req, res) => {
    db.all(
        `SELECT CourseNum, Grade FROM TranscriptCourses`,
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).send("DB error");
            }
            res.json(rows);
        }
    );
});


//populates the transcript upload page's dropdown with all of the majors in the database
app.get('/api/programs', (req, res) => {
    db.all(
        'SELECT DISTINCT program_name FROM requirements',
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // return clean array of strings
            res.json(rows.map(r => r.program_name));
        }
    );
});

//checks if the user has advisor privelege
app.get('/api/is-advisor', (req, res) => {
    const user = req.session.user; 

    db.get('SELECT IsAdvisor FROM Users WHERE Username = ?', [user], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.json({ isAdvisor: false });

        //checks if the advisor row is true or false
        const isAdvisor = row.IsAdvisor === 'true' || row.IsAdvisor === 1;
        res.json({ isAdvisor });//returns bool
    });
});

app.post('/scrape', async (req, res) => {//called when advisor submits on the requirement scraper
    const url = req.body.url;
    if (!isValidUrl(url)) {//checks to ensure link leads to wku's catalogs, does this if fails
        return res.status(400).send('Invalid URL. <br> Proper format: https://catalog.wku.edu/undergraduate/science-engineering/engineering-applied-sciences/computer-science-bs/ <br> <a href="/advisorpanel">Go back</a>');
    }

    try {//run the requirement scraper main function
        const result = await requirementScraper(url);
        return res.send('Requirement Scraper complete! Thank you for waiting. <a href="/advisorpanel">Go back</a>');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error scraping the website.<a href="/advisorpanel">Go back</a>');
    }
});

function isValidUrl(input) {//checks to ensure link leads to wku's catalogs
    try {
        const parsed = new URL(input.trim());

        return (
            (parsed.protocol === "http:" || parsed.protocol === "https:") &&
            parsed.hostname.toLowerCase() === "catalog.wku.edu"
        );
    } catch (err) {
        return false;
    }
}


//this is what originally ran when you logout, which i replaced with the new one
//app.get('/logout', (req, res) => {
//    req.session.destroy(() => {
//        res.redirect('/');
//    });
//});

//new logout function that deletes transcript table data
app.get("/logout", (req, res) => {
    clearTranscriptTables(db)
        .then(() => {
            req.session.destroy(err => {//deletes users express session
                if (err) {
                    return res.status(500).send("Logout failed");
                }

                res.redirect("/"); //login page
            });
        })
        .catch(err => {//error catch
            console.error(err);
            res.status(500).send("Error clearing transcript data");
        });
});


//starts the server
app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});

//when a user submits a major on the transcript page
app.post("/programselect", async (req, res) => {
    try {
        const program = req.body.program;

        if (!program) {
            return res.status(400).send("No program selected");
        }

        req.session.program = program;

        // generate plan WITHOUT transcript
        const plan = await generatePlan(
            program,
            false,  // transcript = false
            false,  // sixCourse default
            false,  // summer
            false   // winter
        );

        req.session.fourYearPlan = plan;

        res.redirect("/fouryearplan?source=programselect");

    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});