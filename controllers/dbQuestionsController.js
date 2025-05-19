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
            const originalQuestionId = mcq._id;
            const existingQuestion = await Question.findOne({
                examId: examId,
                questionId: originalQuestionId
            });

            if (existingQuestion) {
                console.log(`Question ${originalQuestionId} already exists in this exam, skipping`);
                continue; // Skip this question as it's already in the exam
            }
            const newQuestion = new Question({
                examId: examId,
                questionId: originalQuestionId, // Store the original ID
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
                { $push: { mcqQuestions: newQuestion._id} }
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
        const randomDifficulty = req.body.randomDifficulty || '';
        
        if (totalRandom > 0) {
            // Total random selection
            if (totalRandom > remainingNeeded) {
                return res.redirect(`/admin/exam/${examId}/database?error=Requested more questions than needed`);
            }
            
            // Get the questionId values from Question collection for already added questions
            const alreadyAddedQuestions = await Question.find({
                examId: examId,
                questionType: 'mcq'
            }).select('questionId');
            
            // Extract the questionId values to use for filtering
            const alreadyAddedQuestionIds = alreadyAddedQuestions.map(q => q.questionId);

            // Prepare query for questions NOT already in the exam
            let queryConditions = {
                questionType: 'mcq',
                _id: { $nin: alreadyAddedQuestionIds }
            };

            // Add difficulty filter if specified
            if (randomDifficulty) {
                queryConditions.level = randomDifficulty;
            }

            // Query with the conditions
            const availableQuestions = await AllQuestion.find(queryConditions);
            
            // Convert IDs to strings for comparison
            const alreadyAddedQuestionIdStrings = alreadyAddedQuestionIds.map(id => id.toString());
            
            // Additional check to filter out any questions that might not be caught by the query
            const filteredAvailableQuestions = availableQuestions.filter(question => 
                !alreadyAddedQuestionIdStrings.includes(question._id.toString())
            );
            
            if (filteredAvailableQuestions.length < totalRandom) {
                let errorMessage = `Not enough available questions. Only ${filteredAvailableQuestions.length} unique questions available`;
                if (randomDifficulty) {
                    errorMessage += ` with '${randomDifficulty}' difficulty`;
                }
                return res.redirect(`/admin/exam/${examId}/database?error=${encodeURIComponent(errorMessage)}.`);
            }
            
            // Make a copy of the array to avoid any reference issues
            const questionsCopy = [...filteredAvailableQuestions];
            
            // Shuffle array - more reliable Fisher-Yates shuffle algorithm
            for (let i = questionsCopy.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [questionsCopy[i], questionsCopy[j]] = [questionsCopy[j], questionsCopy[i]];
            }
            
            // Get first N elements
            selectedQuestions = questionsCopy.slice(0, totalRandom);
            
        } else {
            // Classification-based selection
            const classifications = req.body.classifications || [];
            const counts = req.body.counts || [];
            const classificationDifficulties = req.body.classificationDifficulties || [];
            
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
            
            // Get the questionId values from Question collection for already added questions
            const alreadyAddedQuestions = await Question.find({
                examId: examId,
                questionType: 'mcq'
            }).select('questionId');
            
            // Extract the questionId values to use for filtering
            const alreadyAddedQuestionIds = alreadyAddedQuestions.map(q => q.questionId);
            const alreadyAddedQuestionIdStrings = alreadyAddedQuestionIds.map(id => id.toString());
            
            console.log('Already added questionIds for classification-based selection:');
            if (alreadyAddedQuestionIds.length > 0) {
                alreadyAddedQuestionIds.forEach((id, index) => {
                    console.log(`Already added ${index}: ${id}`);
                });
            } else {
                console.log('No questions already added');
            }
            
            // Process each classification
            for (let i = 0; i < classifications.length; i++) {
                const classification = classifications[i];
                const count = parseInt(counts[i]) || 0;
                const difficulty = classificationDifficulties[i] || '';
                
                if (count > 0) {
                    // Prepare query conditions
                    let queryConditions = {
                        questionType: 'mcq',
                        classification: classification,
                        _id: { $nin: alreadyAddedQuestionIds }
                    };
                    
                    // Add difficulty filter if specified
                    if (difficulty) {
                        queryConditions.level = difficulty;
                    }
                    
                    // Query for questions NOT already in the exam and matching conditions
                    const availableQuestions = await AllQuestion.find(queryConditions);
                    
                    // Additional check to filter out any questions that might not be caught by the query
                    const filteredAvailableQuestions = availableQuestions.filter(question => 
                        !alreadyAddedQuestionIdStrings.includes(question._id.toString())
                    );
                    
                    // If we don't have enough questions of this classification with the specified difficulty
                    if (filteredAvailableQuestions.length < count) {
                        let errorMessage = `Not enough ${classification} questions available`;
                        if (difficulty) {
                            errorMessage += ` with '${difficulty}' difficulty`;
                        }
                        errorMessage += `. Only ${filteredAvailableQuestions.length} unique questions available.`;
                        return res.redirect(`/admin/exam/${examId}/database?error=${encodeURIComponent(errorMessage)}`);
                    }
                    
                    // Make a copy of the array to avoid any reference issues
                    const questionsCopy = [...filteredAvailableQuestions];
                    
                    // Shuffle array - more reliable Fisher-Yates shuffle algorithm
                    for (let i = questionsCopy.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [questionsCopy[i], questionsCopy[j]] = [questionsCopy[j], questionsCopy[i]];
                    }
                    
                    // Get first N elements
                    const selected = questionsCopy.slice(0, count);
                    
                    // Add to our selected questions array
                    selectedQuestions = [...selectedQuestions, ...selected];
                }
            }
        }

        const newQuestions = [];
        for (const mcq of selectedQuestions) {
            const originalQuestionId = mcq._id;
            const existingQuestion = await Question.findOne({
                examId: examId,
                questionId: originalQuestionId
            });

            if (existingQuestion) {
                console.log(`Question ${originalQuestionId} already exists in this exam, skipping`);
                continue; // Skip this question as it's already in the exam
            }
            const newQuestion = new Question({
                examId: examId,
                questionId: originalQuestionId, // Store the original ID
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
        
        // Redirect to the manage questions page
        return res.redirect(`/admin/exam/questions/${examId}`);
    } catch (error) {
        console.error('Error adding random questions:', error);
        res.status(500).send('An error occurred while adding random questions');
    }
};