const mongoose = require("mongoose");

const ActivityTrackerSchema = new mongoose.Schema({
    examId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Exam", 
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },
    status: {
        type: String,
        enum: ["active", "inactive", "offline"],
        default: "inactive"
    },
    lastPingTimestamp: {
        type: Date,
        default: Date.now
    },
    pingHistory: [{
        timestamp: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ["active", "inactive", "offline"],
            default: "active"
        }
    }],
    // Optional: Track browser/device info
    clientInfo: {
        browser: String,
        device: String,
        ip: String
    },
    // When the tracking began (exam started)
    startedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    // This ensures the document will be automatically deleted after some time
    // Useful if you want the activity records to expire after exams are completed
    expires: '7d' // Optional: documents will be removed after 7 days
});

// Compound index to ensure uniqueness and optimize queries
ActivityTrackerSchema.index({ examId: 1, userId: 1 }, { unique: true });

// Optional: Add a pre-save hook to track history
ActivityTrackerSchema.pre('findOneAndUpdate', async function() {
    const docToUpdate = await this.model.findOne(this.getQuery());
    if (docToUpdate) {
        const newStatus = this._update.status || 'active';
        const newTimestamp = this._update.lastPingTimestamp || new Date();
        
        // Only add to history if status or substantial time has changed
        const lastHistoryEntry = docToUpdate.pingHistory && docToUpdate.pingHistory.length > 0 ? 
            docToUpdate.pingHistory[docToUpdate.pingHistory.length - 1] : null;
            
        if (!lastHistoryEntry || 
            lastHistoryEntry.status !== newStatus || 
            (new Date(newTimestamp) - new Date(lastHistoryEntry.timestamp)) > 30000) { // 30 seconds
            
            // Add to history
            this.update({}, { 
                $push: { 
                    pingHistory: { 
                        timestamp: newTimestamp, 
                        status: newStatus 
                    } 
                } 
            });
        }
    }
});

module.exports = mongoose.model("ActivityTracker", ActivityTrackerSchema);