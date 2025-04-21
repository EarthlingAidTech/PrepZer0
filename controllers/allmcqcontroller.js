// controllers/mcqQuestionController.js
const MCQQuestion = require('../models/MCQschema');
const fs = require('fs');
const csv = require('csv-parser');


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




exports.csvpage = async (req, res) => {
    res.render("csv");
}


exports.uploadMCQCSV = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).send('No file uploaded');
      }
  
      const createdBy = req.body.createdBy;
      const results = [];
      const errors = [];
  
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
  
          res.json({
            successCount: results.length - errors.length,
            errors: errors,
            total: results.length
          });
        });
    } catch (error) {
      console.error('Error uploading CSV:', error);
      res.status(500).send('Error processing file: ' + error.message);
    }
  };

