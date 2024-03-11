const mongoose = require('mongoose');
const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required."],
    },
    picture: {
      type: String
    },
    name: {
      type: String,
      required: [true, "Name is required."],
    },
    address:{
      type: String,
      // required: [true, "Address is required."]
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: "Service"
    }
  },
  {
    timestamps: true,
  }
);

const User = model("User", userSchema);

module.exports = User;