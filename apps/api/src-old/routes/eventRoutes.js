const express = require('express');
const router = express.Router();
const { varifyToken } = require('../middlewares/varifyToken');
const { schoolIsolation } = require('../middlewares/schoolIsolation');
const {createEvent,deleteEvent,editEvent,getEvents,getoneEvent}=require("../controller/eventController");
const {upload}=require("../middlewares/upload");

// ── Security: require authenticated school user for ALL event routes ──
router.use(varifyToken);
router.use(schoolIsolation);

// Define routes for users
router.post('/addevent', upload.single('image'),createEvent);
router.delete('/deleteEvent',deleteEvent);
router.patch("/editEvent/:id",editEvent);
router.get("/getevents",getEvents);
router.get('/getevents/:id',getoneEvent);

module.exports = router;