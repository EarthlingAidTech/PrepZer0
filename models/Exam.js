
// const mongoose = require("mongoose");

// const ExamSchema = new mongoose.Schema({
//     name: { type: String, required: true },
//     departments: [{ type: String, enum: ["me", "is", "cs", "et", "ec", "ai", "cv", "ee"], required: true }],
//     semester: { type: Number, min: 1, max: 8, required: true },
//     questionType: { type: String, enum: ["mcq", "coding", "mcq&coding"], required: true },
//     numTotalQuestions: { type: Number, default: 0 },
//     numMCQs: { type: Number, default: 0 },
//     numCoding: { type: Number, default: 0 },
//     mcqQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "MCQ" }], // change ref to MCQQuestion for CSV upload
//     codingQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "CodingQuestion" }],
//     createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
//     scheduledAt: { type: Date },
//     scheduleTill: { type: Date },
//     duration: { type: Number },
//     integrityCheck: { type: Boolean, default: false },
//     createdAt: { type: Date, default: Date.now },
//     testStatus: { type: String, enum: ["draft", "ongoing", "completed"], default: "ongoing" },
//     settings:{
//         camera: { type: Boolean, default: false },
//         phone: { type: Boolean, default: true },
//         showResults: { type: Boolean, default: false },


//     }
// });

// // Validation before saving the exam
// ExamSchema.pre("save", function (next) {
//     // Set status to "draft" if either scheduledAt or scheduleTill is missing
//     if (!this.scheduledAt || !this.scheduleTill) {
//         this.testStatus = "draft";
//     }

//     // Question type validation
//     if (this.questionType === "mcq" && this.numMCQs <= 0) {
//         return next(new Error("MCQ exams must have at least one MCQ question."));
//     }
//     if (this.questionType === "coding" && this.numCoding <= 0) {
//         return next(new Error("Coding exams must have at least one coding question."));
//     }
//     if (this.questionType === "mcq&coding") {
//         if (this.numTotalQuestions !== this.numMCQs + this.numCoding) {
//             return next(new Error("Total questions must equal MCQs + Coding questions."));
//         }
//     }
//     next();
// });

// module.exports = mongoose.model("Exam", ExamSchema);

























const mongoose = require("mongoose");

const ExamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    departments: [{ type: String, enum: ["me", "is", "cs", "et", "ec", "ai", "cv", "ee"]}],
    semester: { type: Number, min: 1, max: 8},
    questionType: { type: String, enum: ["mcq", "coding", "mcq&coding"], required: true },
    numTotalQuestions: { type: Number, default: 0 },
    numMCQs: { type: Number, default: 0 },
    numCoding: { type: Number, default: 0 },
    mcqQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "MCQ" }], // change ref to MCQQuestion for CSV upload
    codingQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: "CodingQuestion" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    scheduledAt: { type: Date },
    scheduleTill: { type: Date },
    duration: { type: Number },
    integrityCheck: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    testStatus: { type: String, enum: ["draft", "ongoing", "completed"], default: "ongoing" },
    // Add field to track if exam has Excel candidates (renamed to avoid conflict)
    excelCandidatesPresent: { type: Boolean, default: false },
    // Add field to track if exam has additional individual candidates (renamed to avoid conflict)
    additionalCandidatesPresent: { type: Boolean, default: false },
    settings:{
        camera: { type: Boolean, default: false },
        phone: { type: Boolean, default: true },
        showResults: { type: Boolean, default: false },
    }
});

// Custom validation function to check if Excel candidates exist
async function hasExcelCandidatesForExam(examId) {
    const ExamCandidate = mongoose.model('ExamCandidate');
    const excelCandidates = await ExamCandidate.find({ 
        exam: examId, 
        source: 'excel' 
    });
    return excelCandidates.length > 0;
}

// Custom validation function to check if additional candidates exist
async function hasAdditionalCandidatesForExam(examId) {
    const ExamCandidate = mongoose.model('ExamCandidate');
    const additionalCandidates = await ExamCandidate.find({ 
        exam: examId, 
        isAdditional: true 
    });
    return additionalCandidates.length > 0;
}

// Validation before saving the exam
ExamSchema.pre("save", async function (next) {
    try {
        // Set status to "draft" if either scheduledAt or scheduleTill is missing
        if (!this.scheduledAt || !this.scheduleTill) {
            this.testStatus = "draft";
        }

        // Check if this exam has Excel candidates
        let hasExcel = this.excelCandidatesPresent;
        
        // If this is an update (not new document), check database for Excel candidates
        if (!this.isNew) {
            hasExcel = await hasExcelCandidatesForExam(this._id);
        }

        // Dynamic validation for departments and semester
        // Only skip validation if ONLY Excel candidates are used (no department selection, no individual candidates)
        if (!hasExcel) {
            // If no Excel candidates, then departments and semester are required
            // This covers both traditional department selection and individual candidate selection
            
            // Validate departments
            if (!this.departments || this.departments.length === 0) {
                return next(new Error("At least one department must be selected when not using Excel upload."));
            }
            
            // Validate semester
            if (!this.semester) {
                return next(new Error("Semester must be specified when not using Excel upload."));
            }
        }

        // Question type validation
        if (this.questionType === "mcq" && this.numMCQs <= 0) {
            return next(new Error("MCQ exams must have at least one MCQ question."));
        }
        if (this.questionType === "coding" && this.numCoding <= 0) {
            return next(new Error("Coding exams must have at least one coding question."));
        }
        if (this.questionType === "mcq&coding") {
            if (this.numTotalQuestions !== this.numMCQs + this.numCoding) {
                return next(new Error("Total questions must equal MCQs + Coding questions."));
            }
        }
        
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method to check if exam uses Excel candidates
ExamSchema.methods.hasExcelCandidates = async function() {
    const ExamCandidate = mongoose.model('ExamCandidate');
    const count = await ExamCandidate.countDocuments({ 
        exam: this._id, 
        source: 'excel' 
    });
    return count > 0;
};

// Instance method to check if exam uses additional candidates
ExamSchema.methods.hasAdditionalCandidates = async function() {
    const ExamCandidate = mongoose.model('ExamCandidate');
    const count = await ExamCandidate.countDocuments({ 
        exam: this._id, 
        isAdditional: true 
    });
    return count > 0;
};

// Static method to validate exam before creation/update
ExamSchema.statics.validateExamData = function(examData, hasExcelCandidates = false, hasAdditionalCandidates = false) {
    const errors = [];
    
    // Basic validations
    if (!examData.name || !examData.name.trim()) {
        errors.push("Exam name is required");
    }
    
    if (!examData.questionType) {
        errors.push("Question type is required");
    }
    
    // Dynamic validation for departments and semester
    // Only skip validation if ONLY Excel candidates are used
    if (!hasExcelCandidates) {
        // If no Excel candidates, departments and semester are required
        // This applies to both traditional department selection and individual candidate selection
        if (!examData.departments || examData.departments.length === 0) {
            errors.push("At least one department must be selected when not using Excel upload");
        }
        
        if (!examData.semester) {
            errors.push("Semester must be specified when not using Excel upload");
        }
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
};

module.exports = mongoose.model("Exam", ExamSchema);