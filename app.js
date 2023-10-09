import "dotenv/config";
import express from "express";
import ejs from "ejs";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import encrypt from "mongoose-encryption";
import md5 from "md5";
import bcrypt from "bcrypt";
const saltRounds = 10;
import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

const port = 3000;

mongoose.connect('mongodb://127.0.0.1:27017/userDB');

app.use(express.static(__dirname + "/public/"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    bcrypt.hash(req.body["password"], saltRounds, (err, hash) => {
        const newUser = new User({
            email: req.body["username"],
            password: hash
        });
        newUser.save().then(() => {
            res.render("secrets");
        }).catch((err) => {
            console.log(err);
        });
    });
});

app.post("/login", (req, res) => {
    const username = req.body["username"];
    const password = req.body["password"];
    User.findOne({email: username}).then((foundUser) => {
        if(foundUser){
            bcrypt.compare(password, foundUser.password, (err, result) => {
                if(result){
                    res.render("secrets");
                }else{
                    res.redirect("/login");
                }
            });
        }else{
            res.redirect("/login");
        }
    }).catch((err) => {
        console.log(err);
    });
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
