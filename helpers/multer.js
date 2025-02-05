const multer = require("multer");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
    destination: (req,res,cb) =>{
        cb(null, path.join(__dirname,'../public/uploads/re-images'))
    },
    filename: (req, file, cb) => {
        cb(null,Date.now() + '-' + file.originalname)
    }
})

module.exports = storage;