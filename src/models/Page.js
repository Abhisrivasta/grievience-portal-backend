const mongoose = require('mongoose');

const pageSchema = new mongoose.Schema({
    title : {
        type:String,
        required:true
    },

    description:{
        type:String
    },

    contents:{
        type:String
    }
})

module.exports = mongoose.model("Page",pageSchema)