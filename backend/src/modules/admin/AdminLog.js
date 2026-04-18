const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    action: {
        type: String,
        required: true // e.g., 'BAN_USER', 'DELETE_POST', 'HIDE_COMMENT', 'VERIFY_USER'
    },
    targetType: {
        type: String,
        enum: ['User', 'Post', 'Comment', 'Story', 'Settings'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    details: {
        type: String, // Reason or specific details
        trim: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed // Any extra data
    }
}, { timestamps: true });

module.exports = mongoose.model('AdminLog', adminLogSchema);
