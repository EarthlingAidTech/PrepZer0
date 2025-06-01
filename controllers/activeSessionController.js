const ActivityTracker = require('../models/ActiveSession');
const Exam = require('../models/Exam');
const User = require('../models/usermodel');

exports.trackUserActivity = async (req, res) => {
    console.log("active session pages")
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

        // First, check if there's an existing activity record
        const existingRecord = await ActivityTracker.findOne({ examId, userId });
        
        let updateData = {
            examId,
            userId,
            lastPingTimestamp: timestamp,
            status
        };

        // Check if allowedResubmit is true and update accordingly
        if (existingRecord && existingRecord.isAllowedResubmit === true) {
            console.log('Resubmit allowed: updating StartedAt and setting allowedResubmit to false');
            updateData.startedAt = timestamp; // Update startedAt time
            updateData.isAllowedResubmit = false; // Set allowedResubmit to false
            console.log('Resubmit detected: updating startedAt and setting allowedResubmit to false');
        }

        // Record the activity ping
        const activityRecord = await ActivityTracker.findOneAndUpdate(
            { examId, userId },
            updateData,
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
                lastPing: activityRecord.lastPingTimestamp,
                startedAt: activityRecord.startedAt,
                isAllowedResubmit: activityRecord.isAllowedResubmit
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