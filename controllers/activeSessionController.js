const ActivityTracker = require('../models/ActiveSession');
const Exam = require('../models/Exam');
const User = require('../models/usermodel');
exports.trackUserActivity = async (req, res) => {
    console.log("active seesion pages")
    try {
        const { examId, userId, timestamp, status = 'active' } = req.body;
        console.log(req.body)

        // Validate the exam and user exist
        const examExists = await Exam.findById(examId);
        const userExists = await User.findById(userId);

        if (!examExists || !userExists) {
            return res.status(404).json({ 
                success: false, 
                message: 'Invalid exam or user ID' 
            });
        }

        // Record the activity ping
        const activityRecord = await ActivityTracker.findOneAndUpdate(
            { examId, userId },
            { 
                examId,
                userId,
                lastPingTimestamp: timestamp,
                status
            },
            { 
                upsert: true,  // Create if doesn't exist
                new: true,     // Return updated document
                setDefaultsOnInsert: true // Apply defaults if creating new doc
            }
        );

        res.status(200).json({
            success: true,
            data: {
                userId: activityRecord.userId,
                examId: activityRecord.examId,
                status: activityRecord.status,
                lastPing: activityRecord.lastPingTimestamp
            }
        });

    } catch (error) {
        console.error('Error tracking user activity:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while tracking activity',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};