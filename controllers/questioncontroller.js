const Exam = require("../models/Exam");
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
        const { question, options, correctAnswer, marks, classification, level } = req.body;
        
        // Validate required fields
        if (!question || !options || !correctAnswer || !classification || !level) {
            return res.status(400).send("All fields are required.");
        }

        // Create and save the main MCQ
        const newMCQ = new MCQ({
            examId: req.params.examId,
            classification,
            level,
            question,
            options: options.split(",").map(opt => opt.trim()), // Trim whitespace
            correctAnswer: correctAnswer.trim(),
            marks: parseInt(marks) || 1
        });
        
        await newMCQ.save();
        console.log("MCQ saved successfully:", newMCQ._id);

        // Update the exam with the new MCQ
        await Exam.findByIdAndUpdate(req.params.examId, { 
            $push: { mcqQuestions: newMCQ._id } 
        });
        console.log("Exam updated successfully");

        // Handle AllMCQ saving with better error handling
        try {
            // Normalize the question text to handle minor differences
            const normalizeText = (text) => {
                if (!text || typeof text !== 'string') return '';
                return text
                    .toLowerCase()
                    .replace(/\s+/g, ' ')
                    .replace(/['",.?!;:()\[\]{}]/g, '')
                    .trim();
            };

            const normalizedQuestion = normalizeText(question);

            // Simple duplicate check using regex (more MongoDB-friendly)
            const existingQuestion = await AllMCQ.findOne({
                question: { 
                    $regex: new RegExp(`^${normalizedQuestion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') 
                }
            }).limit(1);

            // Alternative approach: Load all questions and check in JavaScript
            // This is more reliable but less efficient for large datasets
            if (!existingQuestion) {
                // Get all questions to check for duplicates in JavaScript
                const allQuestions = await AllMCQ.find({}, { question: 1 }).lean();
                
                const isDuplicate = allQuestions.some(existingQ => {
                    const existingNormalized = normalizeText(existingQ.question);
                    return existingNormalized === normalizedQuestion;
                });

                if (!isDuplicate) {
                    const allMCQEntry = new AllMCQ({
                        classification,
                        level,
                        question,
                        options: options.split(",").map(opt => opt.trim()),
                        correctAnswer: correctAnswer.trim(),
                        marks: parseInt(marks) || 1
                    });
                    
                    await allMCQEntry.save();
                    console.log("Question saved to AllMCQ collection with ID:", allMCQEntry._id);
                    
                    // Update the MCQ record with the AllMCQ ID
                    await MCQ.findByIdAndUpdate(newMCQ._id, {
                        questionId: allMCQEntry._id
                    });
                    console.log("MCQ updated with questionId:", allMCQEntry._id);
                } else {
                    console.log("Question already exists in AllMCQ collection, skipping...");
                    
                    // If duplicate exists, update MCQ with existing AllMCQ ID
                    const existingAllMCQ = allQuestions.find(existingQ => {
                        const existingNormalized = normalizeText(existingQ.question);
                        return existingNormalized === normalizedQuestion;
                    });
                    
                    if (existingAllMCQ) {
                        await MCQ.findByIdAndUpdate(newMCQ._id, {
                            questionId: existingAllMCQ._id
                        });
                        console.log("MCQ updated with existing questionId:", existingAllMCQ._id);
                    }
                }
            } else {
                console.log("Question already exists in AllMCQ collection, skipping...");
                
                // Update MCQ with existing AllMCQ ID
                await MCQ.findByIdAndUpdate(newMCQ._id, {
                    questionId: existingQuestion._id
                });
                console.log("MCQ updated with existing questionId:", existingQuestion._id);
            }
        } catch (allMCQError) {
            // Log the AllMCQ error but don't fail the main operation
            console.error("Error saving to AllMCQ collection:", allMCQError.message);
            // Continue with redirect since main MCQ was saved successfully
        }

        res.redirect(`/admin/exam/questions/${req.params.examId}`);
    } catch (error) {
        console.error("Error in postaddmcqQuestion:", error);
        
        // More specific error messages
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).send(`Validation Error: ${errors.join(', ')}`);
        }
        
        if (error.name === 'CastError') {
            return res.status(400).send("Invalid data format provided.");
        }
        
        res.status(500).send(`Error adding MCQ: ${error.message}`);
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
        const { examId, codingId } = req.params;
        
        // Delete the coding question document
        await CodingQuestion.findByIdAndDelete(codingId);
        
        // Remove the reference to the question from the exam document
        await Exam.findByIdAndUpdate(examId, {
            $pull: { codingQuestions: codingId }
        });
        
        // Redirect back to the questions page
        res.redirect(`/admin/exam/questions/${examId}`);
    } catch (error) {
        console.error("Error deleting coding question:", error);
        res.status(500).send("Error deleting coding question");
    }
};
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
        
        // Check if we've already reached the required number of coding questions
        const currentCodingQuestionCount = exam.codingQuestions.length;
        const requiredCodingQuestions = exam.numCoding;
        
        // If we already have the required number of questions, don't add more
        if (currentCodingQuestionCount >= requiredCodingQuestions) {
            console.log(`Already have ${currentCodingQuestionCount} coding questions. Required: ${requiredCodingQuestions}. No more questions added.`);
            return res.redirect(`/admin/exam/questions/${examId}`);
        }
        
        // Calculate how many more questions can be added
        const remainingQuestionSlots = requiredCodingQuestions - currentCodingQuestionCount;
        console.log(`Can add up to ${remainingQuestionSlots} more coding questions.`);
        
        // Array to track the IDs to add to the exam
        const questionIdsToAdd = [];
        let questionsAdded = 0;
        
        // Process each selected question ID
        for (const dbQuestionId of selectedQuestionIds) {
            // Stop if we've reached the limit of questions we can add
            if (questionsAdded >= remainingQuestionSlots) {
                console.log(`Reached limit of ${remainingQuestionSlots} questions to add.`);
                break;
            }
            
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
            const questionAlreadyInExam = exam.codingQuestions.some(
                id => id.toString() === questionIdToAdd.toString()
            );
            
            if (!questionAlreadyInExam) {
                questionIdsToAdd.push(questionIdToAdd);
                questionsAdded++;
                console.log(`Added question ${questionIdToAdd} (${questionsAdded}/${remainingQuestionSlots})`);
            } else {
                console.log(`Question ${questionIdToAdd} already in exam. Skipping.`);
            }
        }
        
        // Add the questions to the exam
        if (questionIdsToAdd.length > 0) {
            exam.codingQuestions.push(...questionIdsToAdd);
            // Note: We don't update numCoding here as it should already be set to the required number
            // The numTotalQuestions should also remain as is, since it's based on the requirements
            await exam.save();
            console.log(`Added ${questionIdsToAdd.length} new coding questions to exam.`);
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
        console.log('Received form data:', req.body);
        
        const { 
            questionTile, 
            questiontext, 
            constraits, 
            inputFormat, 
            outputFormat, 
             
            maxMarks, 
            level, 
            classification, 
            sampleInput, 
            sampleOutput 
        } = req.body;

        // Process starter code from form data
        const starterCode = [];
        const languages = ['cpp', 'c', 'java', 'python', 'csharp', 'javascript'];
        
        languages.forEach(lang => {
            const fieldName = `starterCode_${lang}`;
            if (req.body[fieldName] && req.body[fieldName].trim()) {
                starterCode.push({
                    language: lang,
                    code: req.body[fieldName].trim()
                });
            }
        });

        // Process test cases from form data
        const testCases = [];
        if (req.body.testCases) {
            // If testCases is an array (multiple test cases)
            if (Array.isArray(req.body.testCases)) {
                req.body.testCases.forEach(testCase => {
                    if (testCase.input && testCase.expectedOutput) {
                        testCases.push({
                            input: testCase.input,
                            expectedOutput: testCase.expectedOutput,
                            isPublic: testCase.isPublic === 'true' || testCase.isPublic === true,
                            timeout: parseInt(testCase.timeout) || 2,
                            memoryLimit: parseInt(testCase.memoryLimit) || 256
                        });
                    }
                });
            } else {
                // Single test case object
                const testCase = req.body.testCases;
                if (testCase.input && testCase.expectedOutput) {
                    testCases.push({
                        input: testCase.input,
                        expectedOutput: testCase.expectedOutput,
                        isPublic: testCase.isPublic === 'true' || testCase.isPublic === true,
                        timeout: parseInt(testCase.timeout) || 2,
                        memoryLimit: parseInt(testCase.memoryLimit) || 256
                    });
                }
            }
        }

        // Alternative way to process test cases if the above doesn't work
        // This handles the form array naming convention testCases[0][input], etc.
        if (testCases.length === 0) {
            let i = 0;
            while (req.body[`testCases[${i}][input]`]) {
                const input = req.body[`testCases[${i}][input]`];
                const expectedOutput = req.body[`testCases[${i}][expectedOutput]`];
                const isPublic = req.body[`testCases[${i}][isPublic]`] === 'true';
                const timeout = parseInt(req.body[`testCases[${i}][timeout]`]) || 2;
                const memoryLimit = parseInt(req.body[`testCases[${i}][memoryLimit]`]) || 256;
                
                if (input && expectedOutput) {
                    testCases.push({
                        input,
                        expectedOutput,
                        isPublic,
                        timeout,
                        memoryLimit
                    });
                }
                i++;
            }
        }

        console.log('Processed testCases:', testCases);
        console.log('Processed starterCode:', starterCode);

        // Validate required fields
        if (!questionTile || !questiontext || !maxMarks || !classification || !level) {
            return res.status(400).send("Required fields are missing.");
        }

        if (testCases.length === 0) {
            return res.status(400).send("At least one test case is required.");
        }

        // Create and save the new coding question
        const newCodingQuestion = new CodingQuestion({
            questionTile,
            questiontext,
            constraits,
            inputFormat,
            outputFormat,
            maxMarks: parseInt(maxMarks),
            testCases,
            level,
            classification,
            createdBy: req.user._id,
            sampleInput,
            sampleOutput,
            starterCode
        });
        
        await newCodingQuestion.save();
        console.log("Coding question saved successfully:", newCodingQuestion._id);

        // Update the exam with the new coding question
        await Exam.findByIdAndUpdate(req.params.examId, { 
            $push: { codingQuestions: newCodingQuestion._id } 
        });
        console.log("Exam updated successfully");

        // Handle DbCodingQuestion operations (non-critical)
        try {
            const existingQuestion = await DbCodingQuestion.findOne({
                questionTile: questionTile,
                questiontext: questiontext
            });
            
            if (!existingQuestion) {
                const addDBCodingQuestion = new DbCodingQuestion({
                    questionTile,
                    questiontext,
                    constraits,
                    inputFormat,
                    outputFormat,
                    maxMarks: parseInt(maxMarks),
                    testCases,
                    level,
                    classification,
                    createdBy: req.user._id,
                    sampleInput,
                    sampleOutput,
                    starterCode
                });
                await addDBCodingQuestion.save();
                console.log("Question added to database collection");
            } else {
                console.log("Question already exists in database collection. Not adding duplicate.");
            }
        } catch (dbError) {
            console.error("Error with DbCodingQuestion operations:", dbError.message);
            // Don't throw - just log and continue
        }

        // Redirect after successful submission
        res.redirect(`/admin/exam/questions/${req.params.examId}`);
        
    } catch (error) {
        console.error("Error adding coding question:", error);
        
        // More specific error messages
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).send(`Validation Error: ${errors.join(', ')}`);
        }
        
        if (error.name === 'CastError') {
            return res.status(400).send("Invalid data format provided.");
        }
        
        res.status(500).send(`Error adding Coding Question: ${error.message}`);
    }
}
// exports.postaddcodingQuestion = async (req, res) => {
   
//     try {
//         const { questionTile, questiontext, constraits, inputFormat, outputFormat,  maxMarks, level, classification, testCases, starterCode } = req.body;
//         console.log(req.body);

//         // Create and save the new coding question
//         const newCodingQuestion = new CodingQuestion({
//             questionTile,
//             questiontext,
//             constraits,
//             inputFormat,
//             outputFormat,
//             
//             maxMarks,
//             testCases,
//             level,
//             classification,
//             createdBy: req.user._id,
//             sampleInput: req.body.sampleInput,
//             sampleOutput: req.body.sampleOutput,
//             starterCode
//         });
        
//         await newCodingQuestion.save();
//         console.log("Coding question saved successfully");

//         // Update the exam FIRST (this is the critical operation)
//         await Exam.findByIdAndUpdate(req.params.examId, { $push: { codingQuestions: newCodingQuestion._id } });
//         console.log("Exam updated successfully");

//         // Handle DbCodingQuestion operations (non-critical)
//         try {
//             const existingQuestion = await DbCodingQuestion.findOne({
//                 questionTile: questionTile,
//                 questiontext: questiontext
//             });
            
//             if (!existingQuestion) {
//                 const addDBCodingQuestion = new DbCodingQuestion({
//                     questionTile,
//                     questiontext,
//                     constraits,
//                     inputFormat,
//                     outputFormat,
//                     
//                     maxMarks,
//                     testCases,
//                     level,
//                     classification,
//                     createdBy: req.user._id,
//                     sampleInput: req.body.sampleInput,
//                     sampleOutput: req.body.sampleOutput,
//                     starterCode
//                 });
//                 await addDBCodingQuestion.save();
//                 console.log("Question added to database collection");
//             } else {
//                 console.log("Question already exists in database collection. Not adding duplicate.");
//                 // DON'T return here - just continue to redirect
//             }
//         } catch (dbError) {
//             console.error("Error with DbCodingQuestion operations:", dbError.message);
//             res.redirect(`/admin/exam/questions/${req.params.examId}`)
//             // Don't throw - just log and continue
//         }

//         // Always redirect after successful main operations
//         res.redirect(`/admin/exam/questions/${req.params.examId}`);
        
//     } catch (error) {
//         console.error("Error adding coding question:", error);
//         res.status(500).send("Error adding Coding Question: " + error.message);
//     }
// }
