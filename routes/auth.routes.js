const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
// ℹ️ Handles password encryption
const jwt = require("jsonwebtoken");
// Require the User model in order to interact with the database
const User = require("../models/User.model");
// Require necessary (isAuthenticated) middleware in order to control access to specific routes
const { isAuthenticated } = require("../middleware/jwt.middleware.js");
// Require cloudinary
const fileUploader = require("../config/cloudinary.config");
// How many rounds should bcrypt run the salt (default - 10 rounds)
const saltRounds = 10;
// Require email validator
const emailValidator = require('deep-email-validator')
// Require nodemailer
const nodemailer = require("nodemailer");

router.post("/upload", fileUploader.single("picture"), (req, res, next) => {
  if(!req.file) {
    next(new Error("No file uploaded!"));
    return;
  }
  res.json({picture: req.file.path})
})


// POST /auth/signup  - Creates a new user in the database
router.post("/signup", fileUploader.single("picture"), (req, res, next) => {
  const { email, password, name, address, picture } = req.body;

  // Check if email or password or name are provided as empty strings
  if (email === "" || password === "" || name === "" || address === "" || picture === "") {
    res.status(400).json({ message: "Provide email, password and name" });
    return;
  };

  // Check if the email is from a valid provider
  const validEmailProvider = ["gmail.com", "yahoo.com", "outlook.com", "zoho.com"];
  const emailParts = email.split("@");
  if(emailParts.length !== 2 || !validEmailProvider.includes(emailParts[1])) {
    res.status(400).json({message: "Please sign up with a valid email from one of the supported providers"})
    return;
  }


  // This regular expression checks password for special characters and minimum length
  const passwordRegex = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,}/;
  if (!passwordRegex.test(password)) {
    res.status(400).json({
      message:
        "Password must have at least 6 characters and contain at least one number, one lowercase and one uppercase letter.",
    });
    return;
  }

  // Check the users collection if a user with the same email already exists
  User.findOne({ email })
    .then((foundUser) => {
      // If the user with the same email already exists, send an error response
      if (foundUser) {
        res.status(400).json({ message: "User already exists." });
        return;
      }

      // If email is unique, proceed to hash the password
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashedPassword = bcrypt.hashSync(password, salt);
      
      //upload picture
      let pictureUrl = "";
      if(req.file) {
        pictureUrl = req.file.path;
      }

      // Create the new user in the database
      // We return a pending promise, which allows us to chain another `then`
      return User.create({ email, password: hashedPassword, name, address, picture: pictureUrl });
    })
    .then((createdUser) => {
      // Deconstruct the newly created user object to omit the password
      // We should never expose passwords publicly
      const { email, name, _id, address, picture } = createdUser;

      // Create a new object that doesn't expose the password
      const user = { email, name, _id, address, picture };

      // Send a json response containing the user object
      res.status(201).json({ user: user });

      //Welcome text
      const html = `
        <h2>Welcome on board</h2>
        <p>Dear ${name},

          Welcome to our platform! We're thrilled to have you on board. Thank you for joining our community. <br /> <br /> <br />
          
          With our platform, you can find a lot of amazing food service you like. <br /> <br />
          
          If you have any questions or need assistance, our support team is here to help. <br /> <br />
          Feel free to reach out to us at <p><strong>chefontheway003@gmail.com</strong></p>. <br /> <br />
          
          Once again, welcome! We hope you have a fantastic experience using our platform. <br /> <br /> <br /> <br />
          
          <p>Best regards,</p>
          <h4>Chef On The Way</h4>
          <h4>Pierre Docquin and Solideo Zendrato</h4>
        </p>
      `;


      // Transporter code
      let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.MAIL_USERNAME,
          pass: process.env.MAIL_PASSWORD
        }
      });

      // // Send email to the user
      const mailOptions = {
        from: "chefontheway003@gmail.com",
        to: email,
        subject: "Welcome to Chef On The Way",
        html: html
      }

      transporter.sendMail(mailOptions, (error, info) => {
        if(error) {
          console.error("Error sending welcome email", error)
        } else {
          console.log("Welcome email sent:", info.response)
        }
      })

    })
    .catch((err) => next(err)); // In this case, we send error handling to the error handling middleware.
});


// POST  /auth/login - Verifies email and password and returns a JWT
router.post("/login", (req, res, next) => {
  const { email, password } = req.body;

  // Check if email or password are provided as empty string
  if (email === "" || password === "") {
    res.status(400).json({ message: "Provide email and password." });
    return;
  }

  // Check the users collection if a user with the same email exists
  User.findOne({ email })
    .then((foundUser) => {
      if (!foundUser) {
        // If the user is not found, send an error response
        res.status(401).json({ message: "User not found." });
        return;
      }

      // Compare the provided password with the one saved in the database
      const passwordCorrect = bcrypt.compareSync(password, foundUser.password);

      if (passwordCorrect) {
        // Deconstruct the user object to omit the password
        const { _id, email, name, address, picture } = foundUser;

        // Create an object that will be set as the token payload
        const payload = { _id, email, name, address, picture };

        console.log(payload, "this console log coming from auth.routes line 127");

        // Create a JSON Web Token and sign it
        const authToken = jwt.sign(payload, process.env.TOKEN_SECRET, {
          algorithm: "HS256",
          expiresIn: "6h",
        });

        // Send the token as the response
        res.status(200).json({ authToken: authToken });
      } else {
        res.status(401).json({ message: "Unable to authenticate the user" });
      }
    })
    .catch((err) => next(err)); // In this case, we send error handling to the error handling middleware.
});

// GET  /auth/verify  -  Used to verify JWT stored on the client
router.get("/verify", isAuthenticated, (req, res, next) => {
  // If JWT token is valid the payload gets decoded by the
  // isAuthenticated middleware and is made available on `req.payload`
  //console.log(`req.payload`, req.payload);

  // Send back the token payload object containing the user data
  res.status(200).json(req.payload);
  console.log(req.payload);
});

module.exports = router;
