import "dotenv/config";
import express from "express";
import ejs from "ejs";
import bodyParser from "body-parser";
import mongoose from "mongoose";
// import encrypt from "mongoose-encryption";
// import md5 from "md5";
// import bcrypt from "bcrypt";
// const saltRounds = 10;
import session from "express-session";
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

const port = 3000;

app.use(express.static(__dirname + "/public/"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized:false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://127.0.0.1:27017/userDB');

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/secrets", (req, res) => {
    if(req.isAuthenticated()){
        res.render("secrets");
    }else{
        res.redirect("/login");
    }
});

app.get("/logout", (req, res) => {
    req.logout((err) => {
        if(err){
            console.log(err);
        }else{
            res.redirect("/");
        }
    });
});

app.post("/register", (req, res) => {
    // bcrypt.hash(req.body["password"], saltRounds, (err, hash) => {
    //     const newUser = new User({
    //         email: req.body["username"],
    //         password: hash
    //     });
    //     newUser.save().then(() => {
    //         res.render("secrets");
    //     }).catch((err) => {
    //         console.log(err);
    //     });
    // });

    User.register({username: req.body["username"]}, req.body["password"], (err, user) => {
        if(err){
            console.log(err);
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            });
        }
    });
});

app.post("/login", (req, res) => {
    // const username = req.body["username"];
    // const password = req.body["password"];
    // User.findOne({email: username}).then((foundUser) => {
    //     if(foundUser){
    //         bcrypt.compare(password, foundUser.password, (err, result) => {
    //             if(result){
    //                 res.render("secrets");
    //             }else{
    //                 res.redirect("/login");
    //             }
    //         });
    //     }else{
    //         res.redirect("/login");
    //     }
    // }).catch((err) => {
    //     console.log(err);
    // });

    const user = new User({
        username: req.body["username"],
        password: req.body["password"]
    });

    req.login(user, (err) => {
        if(err){
            console.log(err);
            res.redirect("/login");
        }else{
            passport.authenticate("local")(req, res, () => {
                res.redirect("/secrets");
            })
        }
    })
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});
