const express = require('express');
const { newgroup, getchat, addmembers, removemembers, leavegroup, message, getmessage, renamegroupname, getAllMessages, newchat, getunfriends, sendfriendrequest, acceptfriendrequest } = require('../controllers/chat');
const upload = require('../../../core/http/upload.disk.js');
const { varifyToken } = require('../../../core/security/authenticate.js');
const route = express.Router();


route.post('/onetoone/:friendid',varifyToken, newchat);
route.post('/newgroup',varifyToken, newgroup);
route.get('/getchat',varifyToken, getchat);                                                    
route.put('/addmember', varifyToken, addmembers);
route.delete('/removemember', varifyToken, removemembers);
route.delete('/leavegroup',varifyToken, leavegroup);
route.post('/message',varifyToken,upload.array("photo"), message);
route.get('/message/:chatid', varifyToken, getmessage);
route.put('/renamegroup/:chatid',varifyToken, renamegroupname);
route.get('/allmessage/:chatid', varifyToken, getAllMessages);

route.get('/unfriend', varifyToken, getunfriends);

route.post('/sendfriendrequest/:receiverid',varifyToken,sendfriendrequest)
route.put('/acceptfriendrequest/:id',varifyToken,acceptfriendrequest)

module.exports=route;