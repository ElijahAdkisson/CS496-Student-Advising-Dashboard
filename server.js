//CS496 MAIN SERVER FILE
//WRITTEN BY FREDDY GOODWIN

//requirement imports
const express = require('express');//RBAC
const session = require('express-session');//RBAC
const sqlite3 = require('sqlite3').verbose();//database
const bcrypt = require('bcrypt');//encryption
const path = require('path');//serving HTML
const multer = require("multer");//receiving files from frontend

//imports the functions of the other JS files
const { parseTranscript } = require("./transcriptparser"); //import transcript parser JS calls
const { clearTranscriptTables, db } = require("./dbUtils"); //import database interface JS calls and database
const app = express();

//stores temporary info in memory
//this is where the uploaded transcript is put before the information is sent to the database
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });


app.use(express.static(path.join(__dirname, "public")));


//express session middleware for log in sessions
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'encryptthisstringlater',
    resave: false,
    saveUninitialized: false
}));

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
                return res.send('Database error <a href="/advisorpanel">Go back</a>');
            }

            if (!user) {//nonexistent user
                return res.send('User not found <a href="/advisorpanel">Go back</a>');
            }

            if (username == req.session.user) {//catch to make sure user doesnt delete themself
                return res.send('Cannot delete self <a href="/advisorpanel">Go back</a>');
            }

            db.run('DELETE FROM Users WHERE username = ?', [username], function(err) {
                if (err) {//error catch
                    console.error(err.message);
                }
            return res.send('User deleted <a href="/advisorpanel">Go back</a>');
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

//when a user submits a major on the transcript page
app.post('/programselect', (req, res) => {
    const selectedProgram = req.body.program;

    //save selection as a session variable
    req.session.program = selectedProgram;
    
    res.sendFile(path.join(__dirname, 'public', 'fouryearplan.html'));
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
        if (!req.file) {//submit with no file
            return res.status(400).send("No file uploaded");
        }
        
        if (req.file.mimetype !== "text/plain") {//wrong type check
            //change this to PDF after fixing it
            return res.status(400).send("Only .txt files are allowed");
        }

        const fileContent = req.file.buffer.toString("utf-8");//convert file to string

        const result = await parseTranscript(fileContent, {//send file string to parser
            someOption: true
        });

        res.redirect("/fouryearplan.html?source=uploadtranscript");

    } catch (err) {//error catch
        console.error(err);
        res.status(500).send("Server error");

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
    db.all('SELECT Program FROM Programs', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
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