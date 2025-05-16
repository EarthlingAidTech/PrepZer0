const Question = require('../models/MCQQuestion');
const AllQuestion = require('../models/MCQschema');
const Exam = require('../models/Exam');

/**
 * Display the database questions page with filtering options
 */
exports.showDatabaseQuestions = async (req, res) => {
    try {
        const examId = req.params.examId;
        const exam = await Exam.findById(examId);
        
        if (!exam) {
            return res.status(404).send('Exam not found');
        }
        
        // Get the current MCQ count to calculate how many more are needed
        const currentMCQs = await Question.find({ 
            examId: examId,
            questionType: 'mcq'
        });
        
        const currentMCQCount = currentMCQs.length;
        
        // Get filter parameters from query
        const selectedClassification = req.query.classification || '';
        const selectedDifficulty = req.query.difficulty || '';
        
        // Build the filter query
        const filter = { questionType: 'mcq' };
        
        // Exclude questions that are already part of this exam
        filter.examId = { $ne: examId };
        
        if (selectedClassification) {
            filter.classification = selectedClassification;
        }
        
        if (selectedDifficulty) {
            filter.difficulty = selectedDifficulty;
        }
        
        // Fetch all questions based on the filter
        const questions = await AllQuestion.find(filter);
        
        // Get all unique classifications for the dropdown
        const allQuestions = await AllQuestion.find({ questionType: 'mcq' });
        const classifications = [...new Set(allQuestions.map(q => q.classification).filter(Boolean))];

        
        res.render('database_questions', {
            exam,
            questions,
            classifications,
            selectedClassification,
            selectedDifficulty,
            currentMCQCount
        });
        
    } catch (error) {
        console.error('Error showing database questions:', error);
        res.status(500).send('An error occurred while loading questions from database');
    }
};

/**
 * Add manually selected questions to the exam
 */
exports.addSelectedQuestions = async (req, res) => {
    try {
        const examId = req.params.examId;
        const exam = await Exam.findById(examId);
        
        if (!exam) {
            return res.status(404).send('Exam not found');
        }

        // Get selected question IDs
        const selectedQuestionIds = req.body.selectedQuestions || [];
        
        if (!selectedQuestionIds.length) {
            return res.redirect(`/admin/exam/${examId}/database?error=No questions selected`);
        }
        
        // Get current MCQ count
        const currentMCQs = await Question.find({ 
            examId: examId,
            questionType: 'mcq'
        });
        
        const currentMCQCount = currentMCQs.length;
        const remainingNeeded = exam.numMCQs - currentMCQCount;
        
        if (selectedQuestionIds.length > remainingNeeded) {
            return res.redirect(`/admin/exam/${examId}/database?error=Too many questions selected`);
        }
        
        // Get all the selected questions
        const selectedQuestions = await AllQuestion.find({
            _id: { $in: selectedQuestionIds }
        });



        if (selectedQuestions.length === 0) {
            return res.redirect(`/admin/exam/${examId}/database?error=Selected questions not found`);
        }


        // Create new Question documents for each selected AllMCQ
        const newQuestions = [];
        for (const mcq of selectedQuestions) {
            const newQuestion = new Question({
                examId: examId,
                questionType: 'mcq',
                classification: mcq.classification,
                level: mcq.level,
                question: mcq.question,
                options: mcq.options,
                correctAnswer: mcq.correctAnswer,
                marks: mcq.marks
            });
            
            await newQuestion.save();
            newQuestions.push(newQuestion);
            
            // Update the Exam to include this MCQ
            await Exam.updateOne(
                { _id: examId },
                { $push: { mcqQuestions: newQuestion._id } }
            );
        }
        
        const allMCQs = await Question.find({
            examId: examId,
            questionType: 'mcq'
        });
        
        // Render the view questions page with all questions
        return res.redirect(`/admin/exam/questions/${examId}`);

    } catch (error) {
        console.error('Error adding selected questions:', error);
        res.status(500).send('An error occurred while adding selected questions');
    }
};

/**
 * Add randomly selected questions to the exam
 */
exports.addRandomQuestions = async (req, res) => {
    try {
        const examId = req.params.examId;
        const exam = await Exam.findById(examId);
        
        if (!exam) {
            return res.status(404).send('Exam not found');
        }
        
        // Get current MCQ count
        const currentMCQs = await Question.find({ 
            examId: examId,
            questionType: 'mcq'
        });
        
        const currentMCQCount = currentMCQs.length;
        const remainingNeeded = exam.numMCQs - currentMCQCount;
        
        // Array to hold selected question IDs
        let selectedQuestions = [];
        
        // Determine if we're doing total random selection or by classification
        const totalRandom = parseInt(req.body.totalRandom) || 0;
        
        if (totalRandom > 0) {
            // Total random selection
            if (totalRandom > remainingNeeded) {
                return res.redirect(`/admin/exam/${examId}/database?error=Requested more questions than needed`);
            }
            
            // Get random questions that aren't already in this exam
            const exam = await Exam.findById(examId);

            const alreadyAddedMcqIds = exam.mcqQuestions || [];

            const availableQuestions = await AllQuestion.find({
                questionType: 'mcq',
                _id: { $nin: alreadyAddedMcqIds }
            });
            
            // Shuffle array
            const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
            
            // Get first N elements
            selectedQuestions = shuffled.slice(0, totalRandom);
            
        } else {
            // Classification-based selection
            const classifications = req.body.classifications || [];
            const counts = req.body.counts || [];
            
            // Calculate total count requested
            let totalCount = 0;
            for (const count of counts) {
                totalCount += parseInt(count) || 0;
            }
            
            if (totalCount === 0) {
                return res.redirect(`/admin/exam/${examId}/database?error=No questions requested`);
            }
            
            if (totalCount > remainingNeeded) {
                return res.redirect(`/admin/exam/${examId}/database?error=Requested more questions than needed`);
            }
            
            // Process each classification
            for (let i = 0; i < classifications.length; i++) {
                const classification = classifications[i];
                const count = parseInt(counts[i]) || 0;
                
                if (count > 0) {
                    // Get questions of this classification that aren't in this exam
                    const availableQuestions = await Question.find({
                        questionType: 'mcq',
                        classification: classification,
                        examId: { $ne: examId }
                    });
                    
                    // If we don't have enough questions of this classification
                    if (availableQuestions.length < count) {
                        return res.redirect(`/admin/exam/${examId}/database?error=Not enough ${classification} questions available`);
                    }
                    
                    // Shuffle array
                    const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
                    
                    // Get first N elements
                    const selected = shuffled.slice(0, count);
                    
                    // Add to our selected questions array
                    selectedQuestions = [...selectedQuestions, ...selected];
                }
            }
        }


        const newQuestions = [];
        for (const mcq of selectedQuestions) {
            const newQuestion = new Question({
                examId: examId,
                questionType: 'mcq',
                classification: mcq.classification,
                level: mcq.level,
                question: mcq.question,
                options: mcq.options,
                correctAnswer: mcq.correctAnswer,
                marks: mcq.marks
            });
            
            await newQuestion.save();
            newQuestions.push(newQuestion);
            
            // Update the Exam to include this MCQ
            await Exam.updateOne(
                { _id: examId },
                { $push: { mcqQuestions: newQuestion._id } }
            );
        }
        
        // Get all existing MCQ questions for this exam
        const allMCQs = await Question.find({
            examId: examId,
            questionType: 'mcq'
        });
        
        // Render the manage questions page with both existing and selected questions
        return res.render('view_questions', {
            exam,
            mcqQuestions: allMCQs,
            codingQuestions: exam.codingQuestions || []
        });
        
    } catch (error) {
        console.error('Error adding random questions:', error);
        res.status(500).send('An error occurred while adding random questions');
    }
};