const express = require("express");
const { varifyToken } = require('../../../core/security/authenticate.js');
const { schoolIsolation } = require('../../../core/security/tenantScope.js');
const {
  soloComplain,
  multiAllComplain,
  multiSelectedComplain,
  updateStatus,
  getAllComplains: complains,
  complainForYou,
  complainByMe,
  addSuggestion,
  acceptedComplain,
} = require("../controllers/complaintController.js");
const Router  = express.Router();

// Security: require authenticated school user for ALL complain routes
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