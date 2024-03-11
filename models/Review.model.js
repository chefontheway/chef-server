const mongoose = require('mongoose');
const { Schema, model } = require("mongoose");

const reviewSchema = new Schema (
  {
    description: String,
    service: {
      type: Schema.Types.ObjectId,
      ref: "Service"
    },
    rating: {
      type: Number,
      required: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    name: {
      type: String
    },
    picture: {
      type: String
    }
  },
  {
    timestamps: true,
  }

);

module.exports = model("Review", reviewSchema);
