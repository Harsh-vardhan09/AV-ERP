const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },

    groupchat: {
        type: Boolean,
        default: false
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

    profilepicture: {
        type: String,
        default: 'https://as2.ftcdn.net/v2/jpg/05/89/93/27/1000_F_589932782_vQAEAZhHnq1QCGu5ikwrYaQD0Mmurm0N.jpg'
    },

    // ── Multi-tenancy: scope every chat to one school ──────────────────────────
    schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        index: true,
    }
},
{
    timestamps: true,
},
)

  exports.Chat = mongoose.model('Chat',chatSchema)
