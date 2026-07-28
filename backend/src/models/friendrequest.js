const mongoose = require('mongoose');
const friendrequestSchema = new mongoose.Schema({
    sender:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    status:{
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending',
    }

},
{
    timestamps: true,
},
)
exports.Friend = mongoose.model('Friend',friendrequestSchema)
