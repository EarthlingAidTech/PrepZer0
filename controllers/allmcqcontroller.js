// controllers/mcqQuestionController.js
const MCQQuestion = require('../models/MCQschema');

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