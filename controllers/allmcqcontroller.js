// controllers/mcqQuestionController.js
const MCQQuestion = require('../models/MCQschema');
const Exam = require('../models/Exam');
const fs = require('fs');
const csv = require('csv-parser');
const { result } = require('lodash');


exports.getAllMCQQuestions = async (req, res) => {
    try {
        // Fetch all questions from database
        const mcqQuestions = await MCQQuestion.find().sort({ level: 1 });
        
        // Render the EJS template with the questions
        res.render("allMCQQuestion", {
            mcqQuestions : mcqQuestions
        });
    } catch (error) {
        console.error('Error fetching MCQ questions:', error);
        res.status(500).send("Error loading MCQ questions.");
    }
};




exports.csvPage = async (req, res) => {
    res.render("csv", {examId: req.params.examId});
}


exports.uploadMCQCSV = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send('No file uploaded');
      }
  
      const createdBy = req.body.createdBy;
      const results = [];
      const errors = [];
      const codingQuestions = [];
  
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => {
          results.push({
            classification: data.classification,
            question: data.question,
            options: [data.option1, data.option2, data.option3, data.option4],
            correctAnswer: data.correctAnswer,
            level: data.level,
            marks: parseInt(data.marks, 10),
            createdBy: createdBy
          });
        })
        .on('end', async () => {
          for (const item of results) {
            try {
              const mcqQuestion = new MCQQuestion(item);
              await mcqQuestion.validate();
              await mcqQuestion.save();
              await Exam.findByIdAndUpdate(req.params.examId, { $push: { mcqQuestions: mcqQuestion._id } });
            } catch (error) {
              errors.push({
                question: item.question,
                error: error.message
              });
            }
          }
  
          fs.unlink(req.file.path, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
  
      
        
        const exam = await Exam.findById(req.params.examId)
                    .populate("mcqQuestions")
                    .populate("codingQuestions")
                    .lean();
        // console.log(exam);
        res.render("view_questions", {
            exam,
            mcqQuestions: exam.mcqQuestions || [],
            codingQuestions: exam.codingQuestions || []
        });

        });
    } catch (error) {
      console.error('Error uploading CSV:', error);
      res.status(500).send('Error processing file: ' + error.message);
    }
  };

