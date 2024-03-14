const router = require("express").Router();
const mongoose = require("mongoose");
require('dotenv').config();
const nodemailer = require("nodemailer");
const Reservation = require("../models/Reservation.model");
const Service = require("../models/Service.model");
const stripe = require('stripe')(process.env.STRIPE_KEY);
const { isAuthenticated } = require("../middleware/jwt.middleware");

// Transporter code
let transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USERNAME,
    pass: process.env.MAIL_PASSWORD
  }
});

router.post("/services/:serviceId/reserve", isAuthenticated, (req, res, next) => {
  const { serviceId } = req.params;
  const { fullName, totalPerson, pricePerPerson, date, hour } = req.body;

  if (!mongoose.Types.ObjectId.isValid(serviceId)) {
    res.status(400).json({ message: 'Specific id is not valid' });
    return;
  }

  Service.findById(serviceId)
    .populate({ path: "owner", select: "-password" })
    .then(service => {
      if (!service) {
        res.status(400).json({ message: 'Service not found' });
        return;
      };

      const newReservation = new Reservation({
        service: serviceId,
        user: req.payload,
        fullName: fullName,
        totalPerson: totalPerson,
        pricePerPerson: pricePerPerson,
        totalPrice: totalPerson * pricePerPerson,
        date: date,
        hour: hour
      });

      newReservation.save()
        .then(savedReservation => {
          stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
              price_data: {
                currency: 'eur',
                product_data: {
                  name: 'Chef Service',
                  description: `Reservation for ${totalPerson} people`, // Include a description
                },
                unit_amount: savedReservation.totalPrice * 100, // Convert to cents
              },
              quantity: 1,
            }],
            mode: 'payment',
            success_url: `${process.env.ORIGIN}/reservations`,
            cancel_url: `${process.env.ORIGIN}/services`,
          })
          .then(session => {
            // Prepare email content
            console.log(session, "session Stripe")

            const ownerEmail = service.owner.email;
            const userEmail = req.payload.email;
            const html = `
              <h2>Below are the details of your new reservation:</h2>
              <p><strong>Order by:</strong> ${req.payload.name}</p>
              <p><strong>User Email:</strong> <strong>${userEmail}</strong> </p>
              <p><strong>Total Persons:</strong> ${savedReservation.totalPerson}</p>
              <p><strong>Address:</strong> ${req.payload.address}</p>
              <p><strong>Date:</strong> ${savedReservation.date}</p>
              <p><strong>Hour:</strong> ${savedReservation.hour}</p>
              <p><strong>Price Per Person:</strong> ${savedReservation.pricePerPerson} €</p>
              <p><strong>Total Price:</strong> ${savedReservation.totalPrice} €</p>
              <p><strong>Service by:</strong> ${service.owner.name}</p>
              <br />
              <p><strong>Note:</strong> If you have some detailed requirements, please email this owner at ${ownerEmail}!</p>
              <br /> <br /> <br />
              <p>Best regards,</p>
              <h4>Chef On The Way</h4>
              <h4>Pierre Docquin and Solideo Zendrato</h4>
              <p><strong>chefontheway003@gmail.com</strong></p>
            `;

            // Send email to the owner and user
            transporter.sendMail({
              from: process.env.MAIL_USERNAME,
              to: `${ownerEmail}, ${userEmail}`, // Sending email to both the service owner and the user who made the reservation
              subject: "New Reservation Confirmation",
              html: html
            }, (error, info) => {
              if (error) {
                console.error("Error sending email", error);
              } else {
                console.log("Email sent successfully: ", info.response);
              }

              // After sending the email, send back the response with reservation details and Stripe checkout URL
              res.status(200).json({
                reservation: savedReservation,
                stripeCheckoutUrl: session.url,
              });
            });
          })
          .catch(error => {
            console.error("Stripe error:", error);
            res.status(500).send({ error: "An error occurred while creating the Stripe checkout session" });
          });
        })
        .catch(err => {
          console.log("Failed to make a new reservation", err);
          res.status(500).json({ message: 'Failed to make a new reservation', error: err });
        });
    })
    .catch(err => {
      console.log("Failed to find the service id", err);
      res.status(500).json({ message: 'Failed to find the service id', error: err });
    });
});


router.get("/reservations/all", isAuthenticated, (req, res, next) => {
  Reservation.find({})
    .populate({
      path: "service",
      populate: {
        path: "owner",
        select: "email"
      }
    })
    .populate("user", "-password")
    .then(reservations => {
      res.json(reservations);
    })
    .catch(err => {
      console.log("Failed to fetch reservations", err);
      res.status(500).json({
        message: "Failed to fetch reservations",
        error: err
      });
    });
});



router.get("/reservations/:reservationId", isAuthenticated, (req, res, next) => {
  const { reservationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reservationId)) {
    res.status(400).json({ message: "Specified id is not valid" });
    return;
  }

  Reservation.findById(reservationId)
    .populate({
      path: "service",
      populate: {
        path: "owner",
        select: "email"
      }
    })
    .populate("user", "-password")
    .then(reservation => {
      if (!reservation) {
        res.status(404).json({ message: "Reservation not found" });
        return;
      }

      const ownerEmail = reservation.service.owner.email;
      console.log(ownerEmail);
      // Use the owner's email

      res.json(reservation);
    })
    .catch(err => {
      console.log("Failed to find the reservation", err);
      res.status(500).json({
        message: "Failed to find the reservation",
        error: err
      });
    });
});


router.put("/reservations/:reservationId", isAuthenticated, (req, res, next) => {
  const { reservationId } = req.params;
  const { fullName, totalPerson, pricePerPerson, date, hour } = req.body;

  if (!mongoose.Types.ObjectId.isValid(reservationId)) {
    res.status(400).json({ message: "Specified id is not valid" });
    return;
  }

  Reservation.findByIdAndUpdate(
    reservationId,
    {
      fullName: fullName,
      totalPerson: totalPerson,
      pricePerPerson: pricePerPerson,
      totalPrice: totalPerson * pricePerPerson,
      date: date,
      hour: hour
    },
    { new: true }
  )
    .populate({
      path: "service",
      populate: {
        path: "owner",
        select: "email"
      }
    })
    .populate("user", "-password")
    .then(updatedReservation => {
      if (!updatedReservation) {
        res.status(404).json({ message: "Reservation not found" });
        return;
      }

      const ownerEmail = updatedReservation.service.owner.email;
      const userEmail = updatedReservation.user.email;

      const html = `
        <h2>Your reservation has been updated:</h2>
        <p><strong>Order by:</strong> ${updatedReservation.user.name}</p>
        <p><strong>User Email:</strong> <strong>${userEmail}</strong> </p>
        <p><strong>Total Persons:</strong> ${updatedReservation.totalPerson}</p>
        <p><strong>Address:</strong> ${updatedReservation.user.address}</p>
        <p><strong>Date:</strong> ${updatedReservation.date}</p>
        <p><strong>Hour:</strong> ${updatedReservation.hour}</p>
        <p><strong>Price Per Person:</strong> ${updatedReservation.pricePerPerson} €</p>
        <p><strong>Total Price:</strong> ${updatedReservation.totalPrice} €</p>
        <p><strong>Service by:</strong> ${updatedReservation.fullName} </p>
        <br />
        <p><strong>Noted:</strong> If you have some detailed requirements, please email the owner at ${ownerEmail}!</p>
        <br /> <br /> <br />
        <p>Best regards,</p>
        <h4>Chef On The Way</h4>
        <h4>Pierre Docquin and Solideo Zendrato</h4>
        <p><strong>chefontheway003@gmail.com</strong></p>
      `;

      // Send email to the owner and user
      const mailOptions = {
        from: "chefontheway003@gmail.com",
        to: `${ownerEmail}, ${userEmail}`,
        subject: "Updated Reservation",
        html: html
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending updated reservation email", error);
        } else {
          console.log("Updated reservation email sent:", info.response);
        }
      });

      res.json(updatedReservation);
    })
    .catch(err => {
      console.log("Failed to update the reservation", err);
      res.status(500).json({
        message: "Failed to update the reservation",
        error: err
      });
    });
});





router.delete("/reservations/:reservationId", isAuthenticated, (req, res, next) => {
  const { reservationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(reservationId)) {
    res.status(400).json({ message: "Specified id is not valid" });
    return;
  }

  Reservation.findByIdAndDelete(reservationId)
    .then(deletedReservation => {
      if (!deletedReservation) {
        res.status(404).json({ message: "Reservation not found" });
        return;
      }
      res.json({ message: `Reservation with id ${reservationId} was removed successfully.` });
    })
    .catch(err => {
      console.log("Failed to delete the reservation", err);
      res.status(500).json({
        message: "Failed to delete the reservation",
        error: err
      });
    });
});



module.exports = router;