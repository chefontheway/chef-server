const { mongoose } = require("mongoose");
const {Schema, model } = require("mongoose");

const myMessage = new Schema(
  {
    to: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
      required: true
    },
    from: {
      type: String
    }
  },
  {
    timestamps: true
  }
)

module.exports = model("Message", myMessage);
