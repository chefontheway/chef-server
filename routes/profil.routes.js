const router = require("express").Router();
const mongoose = require("mongoose");
const Reservation = require("../models/Reservation.model");
const Service = require("../models/Service.model");
const User = require("../models/User.model");
const { isAuthenticated } = require("../middleware/jwt.middleware");

router.get("/profile", isAuthenticated, (req, res, next) => {
  const {_id, email, name, address, picture} = req.payload;
  res.status(200).json({_id, email, name, address, picture})
  console.log(req.payload, "this data coming form line 95");
})


router.get("/profile/:id", isAuthenticated, (req, res, next) => {
  const userId = req.params.id
  console.log(userId)

  User.findById(userId)
    .select("-password") // Exclude the password field from the query result 
    .then(user => res.json(user))
    .catch(e => {
      console.log("failed to get the user id", e);
      res.status(500).json({
        message: "failed to get the user id",
        error: e
      })
    })
  
})

// PUT /auth/profile - Updates the user's profile
router.put("/profile/:id", isAuthenticated, (req, res, next) => {
  const { name, address, picture } = req.body;
  const userId = req.payload._id; 

  User.findByIdAndUpdate(
    userId,
    { name, address, picture },
    { new: true }
  )
    .select("-password")
    .then((updatedUser) => {
      res.json(updatedUser)
    })
    .catch((err) => next(err));
});


router.get('/myService', isAuthenticated, (req, res, next) => {
    const userId = req.payload._id
    console.log(userId)
    Service.find({owner: userId})
        .then(response => {
            console.log(response);
            res.json(response)
        })
        .catch(err => {
            console.log("error getting list of projects", err);
            res.status(500).json({
                message: "error getting list of projects",
                error: err
            });
        })
  });

  router.get("/reservations", isAuthenticated, (req, res, next) => {
    const userId = req.payload;
    
    console.log(userId, "tell me this one");
  
    Reservation.find({ user: userId })
      .populate("service") // Populate the service information
      .populate({path: "user", select: "-password"})
      .then(reservations => {
        console.log(reservations);
        res.json(reservations);
      })
      .catch(err => {
        console.log("Failed to retrieve reservations", err);
        res.status(500).json({
          message: "Failed to retrieve reservations",
          error: err
        });
      });
  });


module.exports = router;