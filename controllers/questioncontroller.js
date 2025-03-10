const Exam = require("../models/Exam");

const sendEmails = require('./../utils/email')
const User = require('./../models/usermodel')
const { v4: uuidv4 } = require('uuid');
const passport =  require('passport')

const MCQ = require("./../models/MCQQuestion");
const CodingQuestion = require("./../models/CodingQuestion");

exports.getQuestion = async (req, res,) => {
    try {
        const exam = await Exam.findById(req.params.examId)
            .populate("mcqQuestions")
            .populate("codingQuestions");

        res.render("view_questions", {
            exam,
            mcqQuestions: exam.mcqQuestions || [],
            codingQuestions: exam.codingQuestions || []
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading questions.");
    }
};



exports.getaddmcqQuestion = async (req, res) => {
    try {
        const predefinedQuestions = await MCQ.find({ isPredefined: true }); // Fetch predefined MCQs
        res.render("add_mcq", { 
            examId: req.params.examId, 
            predefinedQuestions 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading add MCQ page.");
    }
};





exports.getEditmcqQuestion = async (req, res) => {
   try {
        const mcq = await MCQ.findById(req.params.mcqId);
        if (!mcq) return res.status(404).send("MCQ not found");
        res.render("edit_mcq", { mcq, examId: req.params.examId });
    } catch (error) {
        res.status(500).send("Error fetching MCQ question");
    }
}

exports.postEditmcqQuestion = async (req, res) => {


    try {
        await MCQ.findByIdAndUpdate(req.params.mcqId, req.body);
        res.redirect(`/admin/exam/questions/${req.params.examId}`);
    } catch (error) {
        res.status(500).send("Error updating MCQ question");
    }
}

exports.deleteMCQ = async (req, res) => {
    try {
        await MCQ.findByIdAndDelete(req.params.mcqId);
        res.redirect(`/admin/exam/questions/${req.params.examId}`);
    } catch (error) {
        res.status(500).send("Error deleting MCQ question");
    }
}


exports.getEditcodingQuestion = async (req, res) => {
    try {
        const codingQuestion = await CodingQuestion.findById(req.params.codingId);
        if (!codingQuestion) return res.status(404).send("Coding question not found");
        res.render("edit_coding", { codingQuestion, examId: req.params.examId });
    } catch (error) {
        res.status(500).send("Error fetching coding question");
    }
}


exports.postEditcodingQuestion = async (req, res) => {
    try {
        await CodingQuestion.findByIdAndUpdate(req.params.codingId, req.body);
        res.redirect(`/admin/exam/questions/${req.params.examId}`);
    } catch (error) {
        res.status(500).send("Error updating coding question");
    }
}

exports.deleteCoding = async (req, res) => {
    try {
        await CodingQuestion.findByIdAndDelete(req.params.codingId);
        res.redirect(`/admin/exam/questions/${req.params.examId}`);
    } catch (error) {
        res.status(500).send("Error deleting coding question");
    }
}



exports.getPredefinedMCQs = async (req, res) => {
    try {
        const mcqs = await MCQ.find({ isPredefined: true });
        res.json(mcqs);
    } catch (error) {
        res.status(500).send("Error fetching predefined MCQs.");
    }
};

exports.getPredefinedCodingQuestions = async (req, res) => {
    try {
        const codingQuestions = await CodingQuestion.find({ isPredefined: true });
        res.json(codingQuestions);
    } catch (error) {
        res.status(500).send("Error fetching predefined coding questions.");
    }
};






exports.getaddcodingQuestion = async (req, res) => {
    try {
        const predefinedQuestions = await CodingQuestion.find({ isPredefined: true }); // Fetch predefined coding questions
        res.render("add_coding", { 
            examId: req.params.examId, 
            predefinedQuestions 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error loading add coding question page.");
    }
};

exports.postaddmcqQuestion = async (req, res) => {
    try {
        const { predefinedId, question, options, correctAnswer, marks } = req.body;
        let newMCQ;

        if (predefinedId) {
            // Use predefined question (fetching only necessary fields)
            const predefinedMCQ = await MCQ.findById(predefinedId);
            if (!predefinedMCQ) return res.status(404).send("Predefined MCQ not found");

            newMCQ = new MCQ({
                examId: req.params.examId,
                question: predefinedMCQ.question,
                options: predefinedMCQ.options,
                correctAnswer: predefinedMCQ.correctAnswer,
                marks: predefinedMCQ.marks
            });

            await newMCQ.save();
        } else {
            // Create a new question manually
            newMCQ = new MCQ({
                examId: req.params.examId,
                question,
                options: options.split(","),
                correctAnswer,
                marks
            });

            await newMCQ.save();
        }

        await Exam.findByIdAndUpdate(req.params.examId, { $push: { mcqQuestions: newMCQ._id } });
        res.redirect(`/admin/exam/questions/${req.params.examId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error adding MCQ.");
    }
};
exports.postaddcodingQuestion = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).send("Unauthorized: User not logged in");
        }

        const { predefinedId, questionTitle, questionText, constraints, inputFormat, outputFormat, sampleInput, sampleOutput, solutionTemplate, marks } = req.body;
        let newCodingQuestion;

        if (predefinedId) {
            const predefinedCoding = await CodingQuestion.findById(predefinedId).lean();
            if (!predefinedCoding) return res.status(404).send("Predefined coding question not found");

            newCodingQuestion = new CodingQuestion({
                examId: req.params.examId,
                questionTitle: predefinedCoding.questionTitle,
                questionText: predefinedCoding.questionText,
                constraints: predefinedCoding.constraints,
                inputFormat: predefinedCoding.inputFormat,
                outputFormat: predefinedCoding.outputFormat,
                sampleInput: predefinedCoding.sampleInput,
                sampleOutput: predefinedCoding.sampleOutput,
                solutionTemplate: predefinedCoding.solutionTemplate,
                marks: predefinedCoding.marks,
                createdBy: req.user._id
            });
        } else {
            newCodingQuestion = new CodingQuestion({
                examId: req.params.examId,
                questionTitle,
                questionText,
                constraints,
                inputFormat,
                outputFormat,
                sampleInput,
                sampleOutput,
                solutionTemplate,
                marks,
                createdBy: req.user._id
            });
        }

        await newCodingQuestion.save();
        await Exam.findByIdAndUpdate(req.params.examId, { $push: { codingQuestions: newCodingQuestion._id } });

        res.redirect(`/admin/exam/questions/${req.params.examId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error adding Coding Question.");
    }
};


