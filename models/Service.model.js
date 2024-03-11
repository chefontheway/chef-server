const mongoose = require('mongoose');
const { Schema, model } = require("mongoose");

const serviceModel = new Schema(
    {
        picture:{
            type: String,
        },
        speciality:{
            type: String,
            required: true,
        },
        place:{
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        pricePerPerson:{
            type: Number,
            required: true,
        },
        owner:{
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        availability: {
            type: String,
            required: true
        },
        reviews: [{
            type: Schema.Types.ObjectId,
            ref: "Review"
        }]
      
    },
    {
        timestamps: true
    }
)

module.exports = model("Service", serviceModel)