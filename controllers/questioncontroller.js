const Exam = require("../models/Exam");

const sendEmails = require('./../utils/email')
const User = require('./../models/usermodel')
const { v4: uuidv4 } = require('uuid');
const passport =  require('passport')
const DbCodingQuestion = require('./../models/Codingschema')

const MCQ = require("./../models/MCQQuestion");


const AllMCQ = require("../models/MCQschema");


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
        const { question, options, correctAnswer, marks, classification, level} = req.body;
        const newMCQ = new MCQ({
            examId: req.params.examId,
            classification,
            level,
            question,
            options: options.split(","),
            correctAnswer,
            marks
        });
        await newMCQ.save();

        await Exam.findByIdAndUpdate(req.params.examId, { $push: { mcqQuestions: newMCQ._id } });


         // Normalize the question text to handle minor differences
        const normalizeText = (text) => {
            return text
                .toLowerCase()                         // Convert to lowercase
                .replace(/\s+/g, ' ')                  // Normalize whitespace
                .replace(/['",.?!;:()\[\]{}]/g, '')    // Remove punctuation
                .trim();                               // Remove leading/trailing spaces
        };
        const normalizedQuestion = normalizeText(question);

        // Get all questions from AllMCQ and check for similarity
        const allQuestions = await AllMCQ.find({});
        const questionExists = allQuestions.some(q => normalizeText(q.question) === normalizedQuestion);

         // Save to the AllMCQ database as well
        if (!questionExists) {
            const allMCQEntry = new AllMCQ({
                classification,
                level,
                question,
                options: options.split(","),
                correctAnswer,
                marks
            });
            
            await allMCQEntry.save();
        }

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
    const { examId, mcqId } = req.params;
    // console.log("examId:", examId);
    // console.log("mcqId:", mcqId); 
    try {
        await MCQ.findByIdAndDelete(req.params.mcqId);

         // Remove the MCQ ID from the exam's mcqQuestions array
        await Exam.findByIdAndUpdate(
            examId,
            { $pull: { mcqQuestions: mcqId } },
            { new: true }
        );
        
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




exports.addcoding_from_db = async (req, res) => {
    try {
        // Get the exam ID from the request parameters
        const examId = req.params.examId;
        
        // Find the exam by ID
        const exam = await Exam.findById(examId)
            .populate("codingQuestions");
            
        if (!exam) {
            return res.status(404).send("Exam not found");
        }
        
        // Get all coding questions from database
        const dbQuestions = await DbCodingQuestion.find();
        
        // Render the template with the required data
        res.render("sel_coding_db", { 
            examId: examId,
            exam: exam,
            codingQuestions: exam.codingQuestions || [],
            dbQuestions: dbQuestions
        });
    } catch (error) {
        console.error("Error loading coding questions from database:", error);
        res.status(500).send("Error loading coding questions from database.");
    }
}

exports.postcoding_from_db = async (req, res) => {
    try {
        const examId = req.params.examId;
        let selectedQuestionIds = req.body.selectedQuestions;
        
        // Convert to array if it's a single value
        if (!Array.isArray(selectedQuestionIds)) {
            selectedQuestionIds = selectedQuestionIds ? [selectedQuestionIds] : [];
        }
        
        if (selectedQuestionIds.length === 0) {
            return res.status(400).send("No questions selected");
        }
        
        // Find the exam
        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).send("Exam not found");
        }
        
        // Array to track the IDs to add to the exam
        const questionIdsToAdd = [];
        let questionCount = 0;
        
        // Process each selected question ID
        for (const dbQuestionId of selectedQuestionIds) {
            // Get the question from DbCodingQuestion
            const dbQuestion = await DbCodingQuestion.findById(dbQuestionId);
            if (!dbQuestion) continue;
            
            // Check if the question already exists in CodingQuestion by title and text
            const existingQuestion = await CodingQuestion.findOne({
                questionTile: dbQuestion.questionTile,
                questiontext: dbQuestion.questiontext
            });
            
            let questionIdToAdd;
            
            if (existingQuestion) {
                // Use the existing question
                questionIdToAdd = existingQuestion._id;
            } else {
                // Create a new question in CodingQuestion
                const newCodingQuestion = new CodingQuestion({
                    questionTile: dbQuestion.questionTile,
                    questiontext: dbQuestion.questiontext,
                    constraits: dbQuestion.constraits,
                    inputFormat: dbQuestion.inputFormat,
                    outputFormat: dbQuestion.outputFormat,
                    solutionTemplate: dbQuestion.solutionTemplate,
                    maxMarks: dbQuestion.maxMarks,
                    testCases: dbQuestion.testCases,
                    level: dbQuestion.level,
                    classification: dbQuestion.classification,
                    createdBy: req.user._id,
                    sampleInput: dbQuestion.sampleInput,
                    sampleOutput: dbQuestion.sampleOutput
                });
                
                const savedQuestion = await newCodingQuestion.save();
                questionIdToAdd = savedQuestion._id;
            }
            
            // Check if this question is already added to the exam
            if (!exam.codingQuestions.includes(questionIdToAdd)) {
                questionIdsToAdd.push(questionIdToAdd);
                questionCount++;
            }
        }
        
        // Add the questions to the exam
        if (questionIdsToAdd.length > 0) {
            exam.codingQuestions.push(...questionIdsToAdd);
            exam.numCoding += questionCount;
            exam.numTotalQuestions = exam.numMCQs + exam.numCoding;
            await exam.save();
        }
        
        // Redirect to the questions page
        res.redirect(`/admin/exam/questions/${examId}`);
    } catch (error) {
        console.error("Error adding coding questions from database:", error);
        res.status(500).send("Error adding coding questions from database.");
    }
};
exports.postaddcodingQuestion = async (req, res) => {
    try {
        const { questionTile, questiontext, constraits, inputFormat, outputFormat, solutionTemplate, maxMarks, level, classification, testCases } = req.body;
        console.log(req.body);
        
        // This one is for to be seen in exams so it's connected to the exams
        // It says this question belongs to this exam
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
            createdBy: req.user._id,
            sampleInput: req.body.sampleInput,
            sampleOutput: req.body.sampleOutput,
        });
        
        await newCodingQuestion.save();
        
        // Check if a question with the same questiontext and questionTile already exists in DbCodingQuestion
        const existingQuestion = await DbCodingQuestion.findOne({
            questionTile: questionTile,
            questiontext: questiontext
        });
        
        // Only add to DbCodingQuestion if no matching question exists
        if (!existingQuestion) {
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
                createdBy: req.user._id,
                sampleInput: req.body.sampleInput,
                sampleOutput: req.body.sampleOutput,
            });
            await addDBCodingQuestion.save();
            console.log("Question added to database collection");
        } else {
            console.log("Question already exists in database collection. Not adding duplicate.");
            return res.send("exam already exists");
        }

        await Exam.findByIdAndUpdate(req.params.examId, { $push: { codingQuestions: newCodingQuestion._id } });

        res.redirect(`/admin/exam/questions/${req.params.examId}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error adding Coding Question.");
    }
}
