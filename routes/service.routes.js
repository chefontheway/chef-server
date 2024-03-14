const router = require("express").Router();
const mongoose = require("mongoose");
const Reservation = require("../models/Reservation.model");
const Service = require("../models/Service.model");
const { isAuthenticated } = require("../middleware/jwt.middleware");
const fileUploader = require("../config/cloudinary.config");

router.post("/upload", fileUploader.single("picture"), (req, res, next) => {
   
    if (!req.file) {
        next(new Error("No file uploaded!"));
        return;
      }
      res.json({ picture: req.file.path });
});
     
router.post("/services", isAuthenticated, fileUploader.single("picture"), (req, res, next) => {
  const {picture, speciality, place, description, pricePerPerson, availability } = req.body;

  const newService = {
    picture: picture,
    speciality: speciality,
    place: place,
    description: description,
    pricePerPerson: pricePerPerson,
    availability: availability,
    owner: req.payload._id,
  }

  console.log(picture)

  Service.create(newService)
    .then(response => {
        console.log(response.data);
        res.status(201).json(response)
    })
    .catch(err => {
        console.log("error creating a new project", err);
        res.status(500).json({
            message: "error creating a new project",
            error: err
        });
    });
});

router.get('/services', (req, res, next) => {
  Service.find()
      .populate({path: "owner", select: "-password"})
      .then(response => {
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


router.get('/services/:serviceId', (req, res, next) => {
    const { serviceId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(serviceId)) {
        res.status(400).json({message: 'Specified id is not valid'})
    };

    Service.findById(serviceId)
        .populate({path: "owner", select: "-password"})
        .populate('reviews')
        .then(response => {res.json(response)})
        .catch(err => {
            console.log("error getting details of service", err)
            res.status(500).json({
                message: 'error getting details of service',
                error: err
            });
        });

});

router.put('/services/:serviceId', fileUploader.single("picture"), (req, res, next) => {
    const { serviceId } = req.params;

    console.log(serviceId, "tell me this data");

    if(!mongoose.Types.ObjectId.isValid(serviceId)) {
        res.status(400).json({message: 'Specified id is not valid'})
    };

    const newService = {
        speciality: req.body.speciality,
        place: req.body.place,
        description: req.body.description,
        pricePerPerson: req.body.pricePerPerson,
        availability: req.body.availability
      }

      if (req.file) {
        newService.picture = req.file.path;
      } // instead of put in the new service, instead put outside

    Service.findByIdAndUpdate(serviceId, newService, { new: true })
        .then(updateService => {
            console.log(updateService);
            res.json(updateService)
            
        })
        .catch(err => {
            console.log('error updating the service', err)
            res.status(500).json({
                message: 'error updating serive',
                error: err
            })
        })

})

router.delete('/services/:serviceId', (req, res, next) => {
    const { serviceId } = req.params;

    if(!mongoose.Types.ObjectId.isValid(serviceId)) {
        res.status(400).json({message: 'Specific id is not valid'})
        return;
    }

    Service.findByIdAndDelete(serviceId)
        .then(deleteService => res.json({message: `Service with id ${serviceId} was removed successfully.`}))
        .catch(err => {
            console.log('failed to delete', err);
            res.status(500).json({ message: 'failed to delete', error: err})
        })
})


module.exports = router;