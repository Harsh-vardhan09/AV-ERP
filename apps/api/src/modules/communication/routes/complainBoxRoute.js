const express = require('express');
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
  getComplainsStats,
} = require('../controllers/complaintController.js');
const Router = express.Router();
const { authorize } = require('../../../core/security/roleMiddleware.js');

// Security: require authenticated school user for ALL complain routes
Router.use(varifyToken);
Router.use(schoolIsolation);

Router.post('/complain/:id', soloComplain);
Router.get('/complains', authorize('admin'), complains);
Router.get('/complains/stats', authorize('admin'), getComplainsStats);
Router.post('/complain/all/:id', multiAllComplain);
Router.post('/complain/multiple/:id', multiSelectedComplain);
Router.patch('/complain/change/status', authorize('admin'), updateStatus);
Router.get('/complain/:id', complainForYou);
Router.get('/complain/by/:id', complainByMe);
Router.patch('/complain/add/suggestion', addSuggestion);
Router.get('/complain/accepted/:id', acceptedComplain);
module.exports = Router;
