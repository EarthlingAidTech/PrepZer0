// controllers/examController.js
const Exam = require("../models/Exam");
const User = require("./../models/usermodel");
const { v4: uuidv4 } = require("uuid");
const passport = require("passport");
const moment = require("moment-timezone");
function ensureAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role === "admin") {
        return next();
    }
    res.status(401).send("Unauthorized: Admin access only.");
}

function ensureTeacher(req, res, next) {
    if (req.isAuthenticated() && req.user.role === "teacher") {
        return next();
    }
    res.status(401).send("Unauthorized: Teacher access only.");
}

exports.getExam = async (req, res) => {
    if (req.isAuthenticated()) {
        console.log("authenticated");
        const Userprofile = await User.findById({ _id: req.user.id });
        if (Userprofile.usertype === "admin" || Userprofile.usertype === "teacher") {
            res.render("create_exam", { pic: Userprofile.imageurl, logged_in: "true" });
        } else {
            res.redirect("/admin/login");
        }
    } else {
        res.redirect("/admin/login");
    }
};

exports.createExam = async (req, res) => {
    try {
        let { name, departments, semester, questionType, numMCQs, numCoding, numTotalQuestions, scheduledAt, Duration, scheduleTill , draft } = req.body;
        console.log(draft)
        if(!scheduleTill || !scheduledAt){
            console.log("what the fuck")
            const newExamss = new Exam({
                name,
                departments: Array.isArray(departments) ? departments : [departments], 
                semester,
                questionType,
                duration: Duration,
                numMCQs: parseInt(numMCQs) || 0,
                numCoding: parseInt(numCoding) || 0,
                numTotalQuestions: parseInt(numTotalQuestions) || 0,
                createdBy: req.user.id,
                testStatus:"draft"

            });
            await newExamss.save();
            res.redirect("/admin");
        }
        
        else if(draft){
            const newExams = new Exam({
                name,
                departments: Array.isArray(departments) ? departments : [departments], 
                semester,
                questionType,
                duration: Duration,
                numMCQs: parseInt(numMCQs) || 0,
                numCoding: parseInt(numCoding) || 0,
                numTotalQuestions: parseInt(numTotalQuestions) || 0,
                createdBy: req.user.id,
                testStatus:"draft"
            });
            await newExams.save();
            res.redirect("/admin");
        }
        else{

    
        try{
            scheduledAt = moment.tz(scheduledAt, "Asia/Kolkata").toDate();
            scheduleTill = moment.tz(scheduleTill, "Asia/Kolkata").toDate();
        }catch(err){
            console.error("what an errror")
        }
        const newExam = new Exam({
            name,
            departments: Array.isArray(departments) ? departments : [departments], 
            semester,
            questionType,
            scheduledAt,
            scheduleTill,
            duration: Duration,
            numMCQs: parseInt(numMCQs) || 0,
            numCoding: parseInt(numCoding) || 0,
            numTotalQuestions: parseInt(numTotalQuestions) || 0,
            createdBy: req.user.id,
        });

        await newExam.save();
        res.redirect("/admin");
    }
    } catch (error) {
        res.status(400).send(error.message);
    }
};

exports.getEditExam = async (req, res) => {
    if (req.isAuthenticated()) {
        console.log("authenticated");
        const Userprofile = await User.findById({ _id: req.user.id });
        if (Userprofile.usertype === "admin" || Userprofile.usertype === "teacher") {
            try {
                const exam = await Exam.findById(req.params.examId);
                if (!exam) return res.status(404).send("Exam not found.");
                res.render("edit_exam", { pic: Userprofile.imageurl, logged_in: "true", exam });
            } catch (error) {
                console.error(error);
                res.status(500).send("Server error");
            }
        } else {
            res.redirect("/admin/login");
        }
    } else {
        res.redirect("/admin/login");
    }
};

exports.postEditExam = async (req, res) => {
    try {
        let { name, departments, semester, questionType, numMCQs, numCoding, numTotalQuestions, scheduledAt, scheduleTill, duration } = req.body;
        
        scheduledAt = moment.tz(scheduledAt, "Asia/Kolkata").toDate();
        scheduleTill = moment.tz(scheduleTill, "Asia/Kolkata").toDate();
        
        const updatedExam = await Exam.findByIdAndUpdate(
            req.params.examId,
            {
                name,
                departments: Array.isArray(departments) ? departments : [departments],
                semester,
                questionType,
                numMCQs: questionType.includes("mcq") ? parseInt(numMCQs) || 0 : 0,
                numCoding: questionType.includes("coding") ? parseInt(numCoding) || 0 : 0,
                numTotalQuestions: questionType === "mcq&coding" ? (parseInt(numMCQs) || 0) + (parseInt(numCoding) || 0) : 0,
                scheduledAt,
                scheduleTill,
                duration: parseInt(duration) || 60
            },
            { new: true }
        );

        if (!updatedExam) return res.status(404).send("Exam not found.");

        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};

exports.deleteExam = async (req, res) => {
    try {
        const deletedExam = await Exam.findByIdAndDelete(req.params.examId);
        if (!deletedExam) return res.status(404).send("Exam not found.");
        res.redirect("/admin");
    } catch (error) {
        console.error(error);
        res.status(500).send("Server error");
    }
};
