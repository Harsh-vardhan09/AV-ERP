const express = require("express");
const { varifyToken } = require('../middlewares/varifyToken');
const { schoolIsolation } = require('../middlewares/schoolIsolation');
const {soloComplain,multiAllComplain,multiSelectedComplain} = require("../controller/complain.js");
const updateStatus = require("../controller/updatComplainStatus.js")
const complains = require("../controller/getcomplains")
const complainForYou = require("../controller/requestedComplains");
const complainByMe = require("../controller/complainByMe.js");
const addSuggestion = require("../controller/addSuggestion.js");
const acceptedComplain = require("../controller/acceptedComplain.js")
const Router  = express.Router();

// ── Security: require authenticated school user for ALL complain routes ──
Router.use(varifyToken);
Router.use(schoolIsolation);

Router.post("/complain/:id",soloComplain);
Router.get("/complains",complains);
Router.post("/complain/all/:id",multiAllComplain)
Router.post("/complain/multiple/:id",multiSelectedComplain);
Router.patch("/complain/change/status",updateStatus)
Router.get("/complain/:id",complainForYou);
Router.get("/complain/by/:id",complainByMe);
Router.patch("/complain/add/suggestion",addSuggestion);
Router.get("/complain/accepted/:id",acceptedComplain)
module.exports = Router; 