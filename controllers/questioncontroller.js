const Exam = require("../models/Exam");

const sendEmails = require('./../utils/email')
const User = require('./../models/usermodel')
const { v4: uuidv4 } = require('uuid');
const passport =  require('passport')
const DbCodingQuestion = require('./../models/Codingschema')

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
    res.render("add_mcq", { examId: req.params.examId });
}



exports.postaddmcqQuestion = async (req, res) => {
    try {
        const { question, options, correctAnswer, marks } = req.body;
        const newMCQ = new MCQ({
            examId: req.params.examId,
            question,
            options: options.split(","),
            correctAnswer,
            marks
        });
        await newMCQ.save();

        await Exam.findByIdAndUpdate(req.params.examId, { $push: { mcqQuestions: newMCQ._id } });
        res.redirect(`/admin/exam/questions/${req.params.examId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error adding MCQ.");
    }
}




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









exports.getaddcodingQuestion = async (req, res) => {

    res.render("add_coding", { examId: req.params.examId });
}
exports.postaddcodingQuestion = async (req, res) => {
    try {
        const { questionTile, questiontext, constraits, inputFormat, outputFormat, solutionTemplate,maxMarks,level ,classification,testCases } = req.body;
        console.log(req.body)
        //this one is for to be seen in exams so its connected to the exams it sayys this question belongs to this exam
        const newCodingQuestion = new CodingQuestion({
            questionTile,
            questiontext,
            constraits,
            inputFormat,
            outputFormat,
            solutionTemplate,
            maxMarks,
            testCases,
            level,
            classification,
            createdBy: req.user._id
        });
        
 
        await newCodingQuestion.save();
        //we have a database of questions so when we make 1 we push it into the database to so they can retrieve it later also and db increases
        const addDBCodingQuestion = new DbCodingQuestion({
            questionTile,
            questiontext,
            constraits,
            inputFormat,
            outputFormat,
            solutionTemplate,
            maxMarks,
            testCases,
            level,
            classification,
            createdBy: req.user._id
        });
        await addDBCodingQuestion.save();

        await Exam.findByIdAndUpdate(req.params.examId, { $push: { codingQuestions: newCodingQuestion._id } });

        res.redirect(`/admin/exam/questions/${req.params.examId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error adding Coding Question.");
    }
}