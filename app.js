const express = require("express");
const app = express();
const path = require("path");
const env = require("dotenv").config();
const passport = require("./config/passport");
const session = require("express-session");
const db = require("./config/db");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const expressLayouts=require('express-ejs-layouts');
const nocache=require('nocache')
db();

app.use(session({
    secret : process.env.SESSION_SECRET,
    resave : false,
    saveUninitialized : true,
    cookie : {
        secure : false,
        httpOnly : true,
        maxAge : 1000*60*60*24
    }
}));
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine","ejs");
app.use(expressLayouts)
app.set("views",path.join(__dirname,'views'));
app.set('layout','layouts/layout');
app.use(express.static(path.join(__dirname,"public")));
app.use('/uploads/re-images',express.static('public/uploads/re-images'));
//app.use(express.static("public"));
app.use(nocache())
 app.use("/",userRouter);
 app.use("/admin",adminRouter);

const PORT = 3200 || process.env.PORT;
app.listen(PORT, ()=>{
    console.log('server running');
})

module.exports = app;