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
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import findOrCreate from "mongoose-findorcreate";

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

// mongoose.connect("mongodb://127.0.0.1:27017/userDB");

mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('Failed to connect to MongoDB', err);
});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser((user, cb) => {
    process.nextTick(() => {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
});
  
passport.deserializeUser((user, cb) => {
    process.nextTick(() => {
      return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  (accessToken, refreshToken, profile, cb) => {
    User.findOrCreate({ googleId: profile.id }, (err, user) => {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/secrets");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/register", (req, res) => {
    res.render("register");
});

app.get("/secrets", (req, res) => {
    User.find({"secret": {$ne: null}})
    .then((foundUsers) => {
        if(foundUsers){
            res.render("secrets", {usersWithSecret: foundUsers});
        }else{
            res.render("secrets");
        }
    }).catch((err) => {
        console.log(err);
    });
});

app.get("/submit", (req, res) => {
    if(req.isAuthenticated()){
        res.render("submit");
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
    });
});

app.post("/submit", (req, res) => {
    const sumbittedSecret = req.body["secret"];
    User.findById(req.user.id)
    .then((foundUser) => {
        if(foundUser){
            foundUser.secret = sumbittedSecret;
            foundUser.save()
            .then(() => {
                res.redirect("/secrets");
            });
        }
    }).catch((err) => {
        console.log(err);
    });
});

app.listen(process.env.PORT || port, () => {
    console.log(`Listening on port ${port}`);
});
