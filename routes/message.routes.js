const router = require("express").Router();
const User = require("../models/User.model");
const { isAuthenticated } = require("../middleware/jwt.middleware");
const Message = require("../models/Message.model");

router.post("/message/:recipientId", isAuthenticated, (req, res, next) => {
  const recipientId = req.params.recipientId;
  const { text } = req.body;

  console.log(recipientId)

  User.findById(recipientId)
    .then(recipientUser => {
      if (!recipientUser) {
        return res.status(404).json({ message: "Recipient user not found" });
      }

      const newMessage = {
        to: recipientUser._id,
        text: text,
        from: req.payload._id
      };

      Message.create(newMessage)
        .then(response => res.json(response))
        .catch(err => {
          console.error("Failed to create a new message", err);
          res.status(500).json({ message: "Failed to create a new message" });
        });
    })
    .catch(err => {
      console.error("Failed to find recipient user", err);
      res.status(500).json({ message: "Failed to find recipient user" });
    });
});


router.get("/message/:senderId", isAuthenticated, (req, res, next) => {
  const {senderId} = req.params.senderId;

  Message.find(senderId)
    .then(response => res.json(response))
    .catch(e => console.error("failed to fetch the message list", e))
})

module.exports = router;
