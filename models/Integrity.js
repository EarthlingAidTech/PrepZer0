const mongoose = require('mongoose');

const integritySchema = new mongoose.Schema({
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tabChanges: { type: Number, default: 0 },
    mouseOuts: { type: Number, default: 0 },
    fullscreenExits: { type: Number, default: 0 },
    copyAttempts: { type: Number, default: 0 },
    pasteAttempts: { type: Number, default: 0 },
    focusChanges: { type: Number, default: 0 },
    screenConfiguration: { type: String, default: "Unknown" },
    lastEvent: { type: String, default: "N/A" },
    timestamps: { type: Date, default: Date.now }
});

const Integrity = mongoose.model('Integrity', integritySchema);

module.exports = Integrity;


