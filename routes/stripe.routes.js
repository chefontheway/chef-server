const router = require("express").Router();
const ReservationModel = require("../models/Reservation.model"); // Ensure this path matches your file structure
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_KEY);

router.post('/create-checkout-session', async (req, res) => {
  try {
    const { reservationId } = req.body;
    
    // Find the reservation by ID using the correct model variable name
    const reservation = await ReservationModel.findById(reservationId);
    if (!reservation) {
      return res.status(404).send({ error: "Reservation not found" });
    }

    // Create a Stripe checkout session with the dynamic price from the reservation
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'eur', // Make sure to use a supported currency code
            product_data: {
              name: 'Chef Service',
              // Optionally add other product data here
            },
            unit_amount: reservation.totalPrice * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.ORIGIN}/checkout-success`,
      cancel_url: `${process.env.ORIGIN}/services`,
    });

    res.send({ url: session.url });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "An error occurred while creating the checkout session" });
  }
});

module.exports = router;