// const Question = require('../models/MCQQuestion');
// const Exam = require('../models/Exam');

// /**
//  * Display the database questions page with filtering options
//  */
// exports.showDatabaseQuestions = async (req, res) => {
//     try {
//         const examId = req.params.examId;
//         const exam = await Exam.findById(examId);

//         if (!exam) {
//             return res.status(404).send('Exam not found');
//         }

//         const currentMCQs = await Question.find({ 
//             examId: examId,
//             questionType: 'mcq'
//         });

//         const currentMCQCount = currentMCQs.length;

//         const selectedClassification = req.query.classification || '';
//         const selectedDifficulty = req.query.difficulty || '';

//         const filter = { questionType: 'mcq', examId: { $ne: examId } };

//         if (selectedClassification) {
//             filter.classification = selectedClassification;
//         }

//         if (selectedDifficulty) {
//             filter.difficulty = selectedDifficulty;
//         }

//         const questions = await Question.find(filter);
//         const allQuestions = await Question.find({ questionType: 'mcq' });
//         const classifications = [...new Set(allQuestions.map(q => q.classification).filter(Boolean))];

//         res.render('database_questions', {
//             exam,
//             questions,
//             classifications,
//             selectedClassification,
//             selectedDifficulty,
//             currentMCQCount
//         });

//     } catch (error) {
//         console.error('Error showing database questions:', error);
//         res.status(500).send('An error occurred while loading questions from database');
//     }
// };

// /**
//  * Add manually selected questions to the exam
//  */
// exports.addSelectedQuestions = async (req, res) => {
//     try {
//         const examId = req.params.examId;
//         const exam = await Exam.findById(examId);

//         if (!exam) {
//             return res.status(404).send('Exam not found');
//         }

//         const selectedQuestionIds = req.body.selectedQuestions || [];

//         if (!selectedQuestionIds.length) {
//             return res.redirect(`/admin/exam/${examId}/database?error=No questions selected`);
//         }

//         const currentMCQs = await Question.find({ 
//             examId: examId,
//             questionType: 'mcq'
//         });

//         const currentMCQCount = currentMCQs.length;
//         const remainingNeeded = exam.numMCQs - currentMCQCount;

//         if (selectedQuestionIds.length > remainingNeeded) {
//             return res.redirect(`/admin/exam/${examId}/database?error=Too many questions selected`);
//         }

//         for (const questionId of selectedQuestionIds) {
//             const originalQuestion = await Question.findById(questionId);

//             if (originalQuestion) {
//                 const newQuestion = new Question({
//                     questionType: 'mcq',
//                     question: originalQuestion.question,
//                     options: originalQuestion.options,
//                     correctAnswer: originalQuestion.correctAnswer,
//                     examId: examId,
//                     classification: originalQuestion.classification,
//                     difficulty: originalQuestion.difficulty
//                 });

//                 await newQuestion.save();
//             }
//         }

//         res.render('view_questions', {
//             exam,
//             mcqQuestions: exam.mcqQuestions || [],
//         });

//     } catch (error) {
//         console.error('Error adding selected questions:', error);
//         res.status(500).send('An error occurred while adding selected questions');
//     }
// };

// /**
//  * Add randomly selected questions to the exam
//  */
// exports.addRandomQuestions = async (req, res) => {
//     try {
//         const examId = req.params.examId;
//         const exam = await Exam.findById(examId);

//         if (!exam) {
//             return res.status(404).send('Exam not found');
//         }

//         const currentMCQs = await Question.find({ 
//             examId: examId,
//             questionType: 'mcq'
//         });

//         const currentMCQCount = currentMCQs.length;
//         const remainingNeeded = exam.numMCQs - currentMCQCount;
//         const totalRandom = parseInt(req.body.totalRandom) || 0;

//         if (totalRandom > 0) {
//             if (totalRandom > remainingNeeded) {
//                 return res.redirect(`/admin/exam/${examId}/database?error=Requested more questions than needed`);
//             }

//             const availableQuestions = await Question.find({
//                 questionType: 'mcq',
//                 examId: { $ne: examId }
//             });

//             const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
//             const selected = shuffled.slice(0, totalRandom);

//             for (const question of selected) {
//                 const newQuestion = new Question({
//                     questionType: 'mcq',
//                     question: question.question,
//                     options: question.options,
//                     correctAnswer: question.correctAnswer,
//                     examId: examId,
//                     classification: question.classification,
//                     difficulty: question.difficulty
//                 });

//                 await newQuestion.save();
//             }

//         } else {
//             const classifications = req.body.classifications || [];
//             const counts = req.body.counts || [];

//             let totalCount = 0;
//             for (const count of counts) {
//                 totalCount += parseInt(count) || 0;
//             }

//             if (totalCount === 0) {
//                 return res.redirect(`/admin/exam/${examId}/database?error=No questions requested`);
//             }

//             if (totalCount > remainingNeeded) {
//                 return res.redirect(`/admin/exam/${examId}/database?error=Requested more questions than needed`);
//             }

//             for (let i = 0; i < classifications.length; i++) {
//                 const classification = classifications[i];
//                 const count = parseInt(counts[i]) || 0;

//                 if (count > 0) {
//                     const availableQuestions = await Question.find({
//                         questionType: 'mcq',
//                         classification: classification,
//                         examId: { $ne: examId }
//                     });

//                     if (availableQuestions.length < count) {
//                         return res.redirect(`/admin/exam/${examId}/database?error=Not enough ${classification} questions available`);
//                     }

//                     const shuffled = availableQuestions.sort(() => 0.5 - Math.random());
//                     const selected = shuffled.slice(0, count);

//                     for (const question of selected) {
//                         const newQuestion = new Question({
//                             questionType: 'mcq',
//                             question: question.question,
//                             options: question.options,
//                             correctAnswer: question.correctAnswer,
//                             examId: examId,
//                             classification: question.classification,
//                             difficulty: question.difficulty
//                         });

//                         await newQuestion.save();
//                     }
//                 }
//             }
//         }

//         return res.redirect(`/admin/exam/${examId}/questions?success=Questions added successfully`);

//     } catch (error) {
//         console.error('Error adding random questions:', error);
//         res.status(500).send('An error occurred while adding random questions');
//     }
// };



















const Question = require('../models/MCQQuestion');
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
        const questions = await Question.find(filter);
        
        // Get all unique classifications for the dropdown
        const allQuestions = await Question.find({ questionType: 'mcq' });
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
        const selectedQuestions = await Question.find({
            _id: { $in: selectedQuestionIds }
        });
        
        // Get all existing MCQ questions for this exam
        const allMCQs = await Question.find({
            examId: examId,
            questionType: 'mcq'
        });
        
        // Render the manage questions page with both existing and selected questions
        return res.render('view_questions', {
            exam,
            mcqQuestions: [...allMCQs, ...selectedQuestions],
            codingQuestions: exam.codingQuestions || []
        });
        
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
            const availableQuestions = await Question.find({
                questionType: 'mcq',
                examId: { $ne: examId }
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
        
        // Get all existing MCQ questions for this exam
        const allMCQs = await Question.find({
            examId: examId,
            questionType: 'mcq'
        });
        
        // Render the manage questions page with both existing and selected questions
        return res.render('view_questions', {
            exam,
            mcqQuestions: [...allMCQs, ...selectedQuestions],
            codingQuestions: exam.codingQuestions || []
        });
        
    } catch (error) {
        console.error('Error adding random questions:', error);
        res.status(500).send('An error occurred while adding random questions');
    }
};