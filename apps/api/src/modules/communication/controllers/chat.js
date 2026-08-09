const { User } = require("../../identity");
const { Chat } = require("../models/chat");
const { Message } = require("../models/chatmessage");
const { Friend } = require("../models/friendrequest");
const logger = require('../../../core/logging/logger.js');


exports.newchat = async (req, res) => {
    const id = req.userid;
    const {friendid} = req.params;
    const me = await User.findById(id);
    const friend=await User.findById(friendid);   
    const alreadyexists = await Chat.find({
        members: { $all: [id, friendid] },
        schoolId: req.schoolId,   // ── SECURITY: scope to this school only
    })
    if (alreadyexists) {
        return res.status(400).json({
            success: false,
            message: "You have already created a chat with this person",
        }); 
    }
    const allMembers = [friendid, id];
    try {
        const newchat = new Chat({
            members: allMembers,
            name:friend.name,
            groupchat: false,
            schoolId: req.schoolId,   // ── SECURITY: scope to this school only
        });

        await newchat.save();

        return res.status(200).json({
            success: true,
            message: "Group created successfully",
            newchat,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Server error: Unable to create group - ${error.message}`,
        });
    }
};


// Create a new group
exports.newgroup = async (req, res) => {
    const id = req.userid;
    logger.debug(req.userid);
    const { members, name } = req.body;
    const me = await User.findById(id);
    logger.debug(me);
    if (members.length < 2) {
        return res.status(400).json({
            success: false,
            message: "At least two members are required to create a group",
        });
    }
    const allMembers = [...members, id];
    try {
        const group = new Chat({
            members: allMembers,
            name,
            groupchat: true,
            crators:id,
            // TODO: profilepicture is never declared — newgroup throws ReferenceError
            // TODO: source it from req.body or req.file, or delete the field
            // eslint-disable-next-line no-undef
            profilepicture,
            schoolId: req.schoolId,   // ── SECURITY: scope to this school only
        });

        await group.save();

        return res.status(200).json({
            success: true,
            message: "Group created successfully",
            group,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Server error: Unable to create group - ${error.message}`,
        });
    }
};


// get chats by user ID
exports.getchat = async (req, res) => {
    const  id  = req.userid;

    try {
        const chats = await Chat.find({
            members: id,
            schoolId: req.schoolId,   // ── SECURITY: scope to this school only
        }).populate("members", "name email");
        const transformedData = chats.map(({ _id, name, members, groupchat,profilepicture }) => {
            const otherMember = members.find((m) => m._id.toString() !== id.toString());
            return {
                _id,
                profilepicture,
                name: groupchat ? name : otherMember?.name,
                groupchat,
                members: members
                    .filter((member) => member._id.toString() !== id.toString()).map((member) => member._id),
            };
        });

        return res.status(200).json({
            success: true,
            message: "Groups fetched successfully",
            chats: transformedData,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Server error: Unable to fetch groups - ${error.message}`,
        });
    }
};

// Add members to an existing group
exports.addmembers = async (req, res) => {
    const { chatid, members } = req.body;

    try {
        const chat = await Chat.findById(chatid);
        if (!chat) {
            return res.status(400).json({
                success: false,
                message: "Group not found",
            });
        }

        const allMembers = members.map((member) => User.findById(member, "_id name"));
        const allNewMembers = await Promise.all(allMembers);

        const validNewMembers = allNewMembers.filter((member) => member !== null);
        chat.members.push(...validNewMembers.map((member) => member._id));
        
        await chat.save();

        return res.status(200).json({
            success: true,
            message: "Group updated successfully",
            chat,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Server error: Unable to update group - ${error.message}`,
        });
    }
};


// Remove members from a group
exports.removemembers = async (req, res,next) => {
    const { chatid, memberid } = req.body;

    try {
        const chat = await Chat.findById(chatid);
        if (!chat) {
            return res.status(400).json({
                success: false,
                message: "Group not found",
            });
        }
        chat.members = chat.members.filter(
            (member) => member.toString() !== memberid.toString()
        );


        await chat.save();

        return res.status(200).json({
            success: true,
            message: "Member removed successfully",
            chat,
        });
    } catch (error) {
        next(error);
    }
};





//leave myself in the group 
exports.leavegroup  = async (req, res) => {
    const { chatid} = req.body;
       const id = req.userid;
    try {
        const chat = await Chat.findById(chatid);
        if (!chat) {
            return res.status(400).json({
                success: false,
                message: "Group not found",
            });
        }
    
        const remainingMembers = chat.members.filter(
            (member) => member._id.toString() !== id
        );
  
        if (!remainingMembers.length) {
            return res.status(400).json({
                success: false,
                message: "Cannot leave the group, no other members found",
            });
        }
                                   
        if (chat.crators.toString()=== id) {
            const randomMemberIndex = Math.floor(Math.random() * remainingMembers.length);
            const newCreator = remainingMembers[randomMemberIndex];
            chat.crators  = newCreator._id;
        }
  
        chat.members = remainingMembers;
  
        await chat.save(); 
  
        return res.status(200).json({
            success: true,
            message: "Member left successfully",
            chat,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: `Server error: Unable to leave group - ${error.message}`,
        });
    }
  };
  





  exports.message=async (req,res,next)=>{
       const {chatid} = req.body;
       const id= req.userid;
       const me =await User.findById(id);
       const chat = await Chat.findById(chatid);
       const photo =req.files || [];
       if(!chat){
         return res.status(400).json({
             success: false,
             message: "Group not found",
         });
       }
       try{
         const files=[]
         const alldata={
            content :"",
            sender:id,
            sendername:me.name,
            files,
           chat: chatid
         }
         const message = await Message.create(alldata);
         return res.status(200).json({
             success: true,
             successmessage: "Message sent successfully",
             message, 
         })
        }
        catch(error){
         return res.status(500).json({
             success: false,
             message: `Server error: Unable to send message - ${error.message}`,
         });
       }
  } 



  



  exports.getmessage=async(req,res,next)=>{
    const {chatid}=req.params;
    const chats=await Chat.findById(chatid);
    const messages=await Message.find({chat: chatid });
    try{
     return res.status(200).json({
        success: true, 
        message: "Messages fetched successfully",
        chatmessage: messages
     })
    } 
    catch(error){
        return res.status(500).json({
            success: false,
            message:error.message
        })
    }
  }







  exports.renamegroupname=async(req,res,next)=>{
          const {chatid}=req.params;
          const {groupname}=req.body;
          const id= req.userid;

          const chat = await Chat.findById(chatid);
          if(!chat){ 
            return res.status(400).json({
                success: false,
                message: "Group not found",
            });
          }
        try{
            if(!chat.members.includes(id)){
                return res.status(500).json({
                  success:true, 
                  message:"you are not a member of this group"
                })
            }

            if (id!==chat.crators.toString()) {
                return res.status(403).json({
                  success: false,
                  message: "You are not the admin of the group",
                });
              }
            chat.name=groupname;
            await chat.save();
            return res.status(200).json({
                success: true,
                message: "Group name updated successfully",
                chat
            })
        }
        catch(error){
            return res.status(500).json({
                success: false,
                message: `Server error: Unable to update group name - ${error.message}`,
            });
        }

  }


 


  exports.getAllMessages = async (req, res) => {
    const { chatid } = req.params;
      const page = parseInt(req.query.page) || 1;  
    const limit = parseInt(req.query.limit) || 10;  
    const startIndex = (page - 1) * limit;  
  
    try {
      const totalMessages = await Message.countDocuments({ chat: chatid });
        const messages = await Message.find({ chat: chatid })
        .sort({ createdAt: -1 }) 
        .limit(limit)
        .skip(startIndex)
        .populate("sender", "name email");
        messages.reverse();

        res.json({
        success: true,
        message: "Messages fetched successfully",
        messages,
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalMessages,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: `Error fetching messages: ${error.message}`,
      });
    }
  };
  




  exports.getunfriends=async(req,res)=>{
    const {name}=req.query;
    try{
    const allchats= await Chat.find({
        groupchat:false,
        schoolId: req.schoolId,   // ── SECURITY: scope to this school only
    });
    const allusers= allchats.map(chat => chat.members).flat();
    const uniqueusers= await User.find({
        _id: { $nin: allusers },
        schoolId: req.schoolId,   // ── SECURITY: only show users in same school
        name: { $regex: new RegExp(name, 'i') }
  });

  return res.status(200).json({
    success: true,
    message: " chat fetched successfully",
     users: uniqueusers,
  })
}
catch(error){
    return res.status(500).json({
        success: false,
        message:`error fetching ${error.message}`,

    })
}
  }





  exports.sendfriendrequest = async (req, res, next) => {
    const receiverid = req.params.receiverid;
    const senderid = req.userid;

    try {
        const receiver = await User.findById(receiverid);
        if (!receiver) {
            return res.status(400).json({
                success: false,
                message: "Receiver not found",
            });
        }
        if (receiverid === senderid) {
            return res.status(400).json({
                success: false,
                message: "You cannot send a friend request to yourself",
            });
        }
        const requestExist = await Friend.findOne({ sender: senderid, receiver: receiverid });
        if (requestExist) {
            return res.status(400).json({
                success: false,
                message: "Request already sent",
            });
        }
        const newRequest = new Friend({
            sender: senderid,
            receiver: receiverid,
            status: "pending",
        });

        await newRequest.save();

        return res.status(200).json({
            success: true,
            message: "Friend request sent successfully",
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: `Error sending friend request: ${err.message}`,
        });
    }
};




exports.acceptfriendrequest = async (req, res) => {
        const { id } = req.params;
        const { mystatus } = req.body;
        const me = req.userid;
    
        try {
            const request = await Friend.findById(id);
            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: "Friend request not found",
                });
            }
    
            const receiver = request.receiver;
    
            if (receiver.toString() !== me) {
                return res.status(403).json({
                    success: false,
                    message: "Invalid friend request",
                });
            }
    
            if (mystatus === 'accepted') {
                request.status = 'accepted';
            } else {
                request.status = 'rejected';
            }
    
            await request.save();
    
            return res.status(200).json({
                success: true,
                message: "Friend request updated successfully",
            });
    
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: `Error accepting friend request: ${err.message}`,
            });
        }
    };
    



    exports.getallfriends = async (req, res) => {
        const { mystatus } = req.query;
        const me = req.userid;
    
        try {
            const requests = await Friend.find({
                $or: [{ sender: me }, { receiver: me }],
            });
    
            const pendingRequests = requests
                .filter((request) => request.status === "pending")
                .map((request) => request.sender.toString() === me ? request.receiver : request.sender);
    
            const acceptedRequests = requests
                .filter((request) => request.status === mystatus)
                .map((request) => request.sender.toString() === me ? request.receiver : request.sender);
    
            const friends = await User.find({
                _id: { $in: [...pendingRequests, ...acceptedRequests] },
            });
    
            return res.status(200).json({
                success: true,
            })
        }
        catch (err) {
            return res.status(500).json({
                success: false,
                message: `Error fetching friends: ${err.message}`,
            });
        }
    }

   