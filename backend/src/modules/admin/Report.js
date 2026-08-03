const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reporter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    targetType: {
        type: String,
        enum: ['User', 'Post', 'Comment', 'Story', 'Short'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'targetType'
    },
    reason: {
        type: String,
        required: true,
        enum: ['spam', 'harassment', 'inappropriate', 'violence', 'other']
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['pending', 'resolved', 'dismissed'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'urgent'],
        default: 'medium'
    },
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    resolvedAt: {
        type: Date
    }
}, { timestamps: true });

// The user purge deletes reports filed by a user, and clears resolvedBy when
// the resolving admin is removed.
reportSchema.index({ reporter: 1 });
reportSchema.index({ resolvedBy: 1 });

module.exports = mongoose.model('Report', reportSchema);
