const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    content: {
        type: String,
    },
   sender:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    },
    
    sendername:{
        type: String,
        },
    

    chat: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
        required: true,
    },
    crators:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        // required: true
    },

    members:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],

    photo:[{
        public_id:{
            type: String,
            required: true
        },
        url:{
            type: String,
            required: true
        }
    }]
},
{
    timestamps: true,
},
)

  exports.Message = mongoose.model('Message',messageSchema)

