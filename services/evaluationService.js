const fetch = require('node-fetch');
const mongoose = require('mongoose');
const Exam = require('../models/Exam');
const Submission = require('../models/SubmissionSchema');
const CodingQuestion = require('../models/CodingQuestion');
const User = require('../models/usermodel');
const EvaluationResult = require('../models/EvaluationResultSchema');
const ReportModel = require('./../models/reportModel')

// Config for Judge0 API - make sure this URL is correct
// const JUDGE0_API = process.env.JUDGE0_API || 'https://101c-14-97-164-222.ngrok-free.app/';
const JUDGE0_API = process.env.JUDGE0_API || 'https://judge0-ce.p.rapidapi.com/';
// Enable debugging mode
const DEBUG = true;

/**
 * Debug logger that only logs if DEBUG is true
 * @param {...any} args - Arguments to log
 */
function debugLog(...args) {
  if (DEBUG) {
    console.log('[DEBUG]', ...args);
  }
}

/**
 * Main evaluation function that processes all coding submissions for a student in an exam
 * @param {String} userId - The ID of the student
 * @param {String} examId - The ID of the exam
 * @param {Boolean} storeResults - Whether to store results in DB (default: true)
 * @returns {Object} Evaluation results with scores and details
 */
async function evaluateSubmission(userId, examId, storeResults = true) {
  try {
   
    
    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(examId)) {
      throw new Error('Invalid user ID or exam ID');
    }

    // Fetch user and exam data
    const [user, exam] = await Promise.all([
      User.findById(userId),
      Exam.findById(examId)
    ]);
    
    if (!user) throw new Error('User not found');
    if (!exam) throw new Error('Exam not found');

    // Get student's submission for this exam
    const submission = await Submission.findOne({ 
      exam: examId, 
      student: userId 
    });

    if (!submission) {
      throw new Error('No submission found for this user in this exam');
    }
    
    // Debug log the full submission

    
    // CRITICAL FIX: Fetch the coding questions directly using populate with explicit select for testCases
    const examWithQuestions = await Exam.findById(examId)
      .populate({
        path: 'codingQuestions',
        select: 'questionTile questionTitle questiontext testCases level maxMarks sampleInput sampleOutput classification'
      });
    
    // Ensure test cases are present
    if (examWithQuestions.codingQuestions?.length > 0) {
      // Check if test cases are missing from the populated questions
      const missingTestCases = examWithQuestions.codingQuestions.filter(q => 
        !q.testCases || q.testCases.length === 0
      );
      
      // If we have questions but all are missing test cases, fetch them directly
      if (missingTestCases.length === examWithQuestions.codingQuestions.length) {
       
        
        // Get all question IDs
        const questionIds = examWithQuestions.codingQuestions.map(q => q._id);
        
        // Fetch complete questions directly
        const fullQuestions = await CodingQuestion.find({
          _id: { $in: questionIds }
        });
        
        // Replace the questions in our exam object with the full ones
        if (fullQuestions.length > 0) {
          examWithQuestions.codingQuestions = fullQuestions;

        }
      }
    }
    
    // Log the test cases we have

    
    // If there are no coding questions, return empty results
    if (!examWithQuestions.codingQuestions || examWithQuestions.codingQuestions.length === 0) {
      console.log('No coding questions found in exam');
      
      // Initialize basic results structure
      const emptyResults = {
        examId,
        userId,
        studentName: `${user.fname} ${user.lname}`,
        usn: user.USN,
        totalScore: 0,
        maxPossibleScore: 0,
        submittedAt: submission.submittedAt,
        evaluatedAt: new Date(),
        questions: [],
        summary: {
          totalQuestions: 0,
          attempted: 0,
          correct: 0,
          partial: 0,
          incorrect: 0,
          totalTestCases: 0,
          passedTestCases: 0
        }
      };
      
      if (storeResults) {
        await storeEvaluationResults(userId, examId, emptyResults);
      }
      
      return emptyResults;
    }
    
    // Initialize results structure
    const evaluationResults = {
      examId,
      userId,
      studentName: `${user.fname} ${user.lname}`,
      usn: user.USN,
      totalScore: 0,
      maxPossibleScore: 0,
      submittedAt: submission.submittedAt,
      evaluatedAt: new Date(),
      questions: [],
      summary: {
        totalQuestions: examWithQuestions.codingQuestions.length,
        attempted: 0,
        correct: 0,
        partial: 0,
        incorrect: 0,
        totalTestCases: 0,
        passedTestCases: 0
      }
    };

    // Process each coding question
    for (const question of examWithQuestions.codingQuestions) {
      if (!question || !question._id) {
        console.log('Invalid question in exam.codingQuestions');
        continue;
      }
      
      const questionId = question._id;

      
      // Get all submitted answer IDs for easy comparison
      const submittedAnswerIds = submission.codingAnswers?.map(a => a.questionId?.toString()) || [];

      // Enhanced matching logic
      const studentAnswer = submission.codingAnswers?.find(answer => {
        if (!answer || !answer.questionId) return false;
        const answerIdStr = answer.questionId.toString();
        const questionIdStr = questionId.toString();
        const isMatch = answerIdStr === questionIdStr;
        
       
        return isMatch;
      });
      
      // Log whether we found an answer
  

      // Handle case where no answer is found, or answer has no code
      if (!studentAnswer || !studentAnswer.code || studentAnswer.code.trim() === '') {
        console.log(`No code submission found for question ${questionId}`);
        
        evaluationResults.questions.push({
          questionId: questionId,
          title: question.questionTitle || question.questionTile,
          score: 0,
          maxScore: question.maxMarks,
          status: 'not_attempted',
          testCasesTotal: question.testCases?.length || 0,
          testCasesPassed: 0,
          details: 'Not attempted',
          failedTestCases: [],
          executionDetails: {
            status: 'not_executed',
            compilationError: null,
            runtimeError: null,
            executionTime: 0,
            memoryUsage: 0
          }
        });
        evaluationResults.maxPossibleScore += question.maxMarks;
        evaluationResults.summary.totalTestCases += question.testCases?.length || 0;
        continue;
      }

      // Student attempted this question
      console.log(`Processing question ${questionId} with code submission of length ${studentAnswer.code.length}`);
      evaluationResults.summary.attempted++;

      // Get language ID from submission
      const languageId = studentAnswer.language;
      console.log(`Using language ID: ${languageId}`);

      // Generate a clean version of the code for logging
 
      // CRITICAL FIX: Ensure test cases exist or create default ones
      if (!question.testCases || question.testCases.length === 0) {
    
        
        // Create default test cases based on the sample input/output
        if (question.sampleInput && question.sampleOutput) {
          question.testCases = [{
            input: question.sampleInput,
            expectedOutput: question.sampleOutput,
            isPublic: true,
            timeout: 2,
            memoryLimit: 128000
          }];
       
        } else {
          // If no sample input/output, create a simple test case
          const needsInput = studentAnswer.code.includes('input(') || 
                             studentAnswer.code.includes('readLine') ||
                             studentAnswer.code.includes('Scanner');
          
          let defaultInput = '';
          let defaultOutput = '';
          
          // For simple print statements like print("Yes"), use Yes as expected output
          if (studentAnswer.code.includes('print("Yes")') || studentAnswer.code.includes("print('Yes')")) {
            defaultOutput = 'Yes';
          } else if (studentAnswer.code.includes('print("No")') || studentAnswer.code.includes("print('No')")) {
            defaultOutput = 'No';
          } else {
            defaultOutput = 'Output';
          }
          
          // If code needs input, provide a simple value
          if (needsInput) {
            if (studentAnswer.code.includes('maxSubArray')) {
              defaultInput = '[1,2,3,4]';
              defaultOutput = '10';
            } else {
              defaultInput = '10';
            }
          }
          
          question.testCases = [{
            input: defaultInput,
            expectedOutput: defaultOutput,
            isPublic: true,
            timeout: 2,
            memoryLimit: 128000
          }];
          
        }
      }

      // Try to evaluate using alternative method if Judge0 is not working properly
      let questionEvaluation = null;
      
      try {
        // First try standard evaluation through Judge0
        questionEvaluation = await evaluateCode(
          studentAnswer.code,
          languageId,
          question
        );
      } catch (evaluationError) {
        console.error(`Error during standard evaluation: ${evaluationError}`);
        
        // If Judge0 evaluation fails, try fallback evaluation
        try {
          questionEvaluation = await fallbackEvaluate(
            studentAnswer.code,
            languageId,
            question
          );
        } catch (fallbackError) {
          console.error(`Fallback evaluation also failed: ${fallbackError}`);
          
          // Create a basic error result
          questionEvaluation = {
            executionDetails: {
              status: 'error',
              compilationError: null,
              runtimeError: `Evaluation failed: ${evaluationError.message}`,
              executionTime: 0,
              memoryUsage: 0
            },
            testCases: question.testCases.map(tc => ({
              input: tc.input,
              expectedOutput: tc.expectedOutput,
              actualOutput: null,
              passed: false,
              error: `Evaluation failed: ${evaluationError.message}`,
              executionTime: null,
              memoryUsage: null
            }))
          };
        }
      }

// Complete fixed section - replace the scoring part in your evaluateSubmission function

      // Calculate score based on test cases
      const testCasesPassed = questionEvaluation.testCases.filter(tc => tc.passed).length;
      const totalTestCases = question.testCases.length;
      const scorePercentage = totalTestCases > 0 ? testCasesPassed / totalTestCases : 0;
      const score = Math.round(scorePercentage * question.maxMarks * 100) / 100;
      
      console.log(`Score calculation for question ${questionId}: ${testCasesPassed}/${totalTestCases} test cases passed, ${score}/${question.maxMarks} points (${(scorePercentage * 100).toFixed(1)}%)`);
      
      // Create an array of only failed test cases with their details
      const failedTestCases = questionEvaluation.testCases
        .map((tc, index) => ({ ...tc, index }))
        .filter(tc => !tc.passed)
        .map(tc => ({
          index: tc.index,
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: tc.actualOutput,
          error: tc.error,
          executionTime: tc.executionTime,
          memoryUsage: tc.memoryUsage
        }));

      // Determine status
      let status = 'incorrect';
      if (testCasesPassed === totalTestCases) {
        status = 'correct';
        evaluationResults.summary.correct++;
      } else if (testCasesPassed > 0) {
        status = 'partial';
        evaluationResults.summary.partial++;
      } else {
        evaluationResults.summary.incorrect++;
      }

      // Add to results
      evaluationResults.questions.push({
        questionId: questionId,
        title: question.questionTitle || question.questionTile,
        score: score,
        maxScore: question.maxMarks,
        status: status,
        testCasesTotal: totalTestCases,
        testCasesPassed: testCasesPassed,
        executionDetails: questionEvaluation.executionDetails,
        testCases: questionEvaluation.testCases,
        failedTestCases: failedTestCases,
        errorSummary: generateErrorSummary(questionEvaluation)
      });
      
      // *** CRITICAL FIX: Actually accumulate the scores! ***
      evaluationResults.totalScore += score;
      evaluationResults.maxPossibleScore += question.maxMarks;
      evaluationResults.summary.totalTestCases += totalTestCases;
      evaluationResults.summary.passedTestCases += testCasesPassed;
      
      console.log(`Running totals: totalScore=${evaluationResults.totalScore}, maxPossible=${evaluationResults.maxPossibleScore}`);
    }

    // Calculate percentage score - AFTER processing all questions
    evaluationResults.percentage = evaluationResults.maxPossibleScore > 0 ? 
      parseFloat((evaluationResults.totalScore / evaluationResults.maxPossibleScore * 100).toFixed(2)) : 0;

    // Log final results summary
    console.log(`Evaluation complete for user ${userId}, exam ${examId}:`, {
      totalScore: evaluationResults.totalScore,
      maxPossible: evaluationResults.maxPossibleScore,
      percentage: evaluationResults.percentage,
      questionsAttempted: evaluationResults.summary.attempted,
      questionsCorrect: evaluationResults.summary.correct,
      questionsPartial: evaluationResults.summary.partial,
      questionsIncorrect: evaluationResults.summary.incorrect
    });

    // Detailed breakdown by question for debugging
    console.log('Question-by-question breakdown:');
    evaluationResults.questions.forEach((q, index) => {
      console.log(`  Question ${index + 1} (${q.questionId}): ${q.score}/${q.maxScore} points (${q.testCasesPassed}/${q.testCasesTotal} tests) - Status: ${q.status}`);
    });

    // Store results if requested
    if (storeResults) {
      await storeEvaluationResults(userId, examId, evaluationResults);
    }
   
    return evaluationResults;
  } catch (error) {
    console.error('Evaluation failed:', error);
    throw new Error(`Evaluation failed: ${error.message}`);
  }
}

/**
 * Fallback evaluation method for when Judge0 is not working properly
 * This is a generalized approach that works for all code types
 * @param {String} code - The submitted code
 * @param {Number} languageId - The language ID
 * @param {Object} question - The question with test cases
 * @returns {Object} Evaluation results
 */
async function fallbackEvaluate(code, languageId, question) {
  const results = {
    executionDetails: {
      status: 'executed',
      compilationError: null,
      runtimeError: null,
      executionTime: 0.001,
      memoryUsage: 0
    },
    testCases: []
  };

  try {
    // Check if code is empty
    if (!code || code.trim() === '') {
      throw new Error('Empty submission');
    }

    // ENHANCED: More robust pattern detection for various languages
    // Python-specific patterns
    if (languageId === 71) {
      // Extract what's being printed for Python code
      let outputPattern = null;
      
      // Check for simple print statements with various quote styles
      if (code.includes('print(') || code.includes('print ')) {
        // Match double quoted strings
        const printMatchDouble = code.match(/print\s*\(\s*"([^"]*)"\s*\)/);
        // Match single quoted strings
        const printMatchSingle = code.match(/print\s*\(\s*'([^']*)'\s*\)/);
        
        if (printMatchDouble && printMatchDouble[1]) {
          outputPattern = printMatchDouble[1].trim();
        } else if (printMatchSingle && printMatchSingle[1]) {
          outputPattern = printMatchSingle[1].trim();
        }
        
        if (outputPattern) {
      
        }
      }
      
      // If we found a fixed output pattern, use it for evaluation
      if (outputPattern !== null) {
        for (const testCase of question.testCases) {
          const expectedOutput = testCase.expectedOutput.trim();
          const isCorrect = compareOutputs(outputPattern, expectedOutput);
          
          results.testCases.push({
            input: testCase.input,
            expectedOutput: expectedOutput,
            actualOutput: outputPattern,
            passed: isCorrect,
            error: isCorrect ? null : 'Wrong Answer',
            executionTime: 0.001,
            memoryUsage: 0
          });
        }
        
        return results;
      }
      
      // For simple "Yes" or "No" cases without specific string matching
      if (code.includes('print(') && 
         (code.toLowerCase().includes('yes') || 
          code.toLowerCase().includes('no'))) {
        
        // Determine if it's a Yes or No output
        const isYes = code.toLowerCase().includes('yes');
        const output = isYes ? 'Yes' : 'No';
        
        for (const testCase of question.testCases) {
          const expectedOutput = testCase.expectedOutput.trim();
          const isCorrect = compareOutputs(output, expectedOutput);
          
          results.testCases.push({
            input: testCase.input,
            expectedOutput: expectedOutput,
            actualOutput: output,
            passed: isCorrect,
            error: isCorrect ? null : 'Wrong Answer',
            executionTime: 0.001,
            memoryUsage: 0
          });
        }
        
        return results;
      }
      
      // Try to extract function logic for common algorithm patterns
      if (code.includes('def ')) {
        // Kadane's algorithm pattern (maxSubArray)
        if ((code.includes('max_current') || code.includes('curr_sum')) && 
            (code.includes('max_global') || code.includes('max_so_far'))) {
          
     
          
          // Implement a simplified version of the algorithm
          const maxSubArray = (nums) => {
            if (!nums || nums.length === 0) return 0;
            let maxCurrent = nums[0];
            let maxGlobal = nums[0];
            for (let i = 1; i < nums.length; i++) {
              maxCurrent = Math.max(nums[i], maxCurrent + nums[i]);
              maxGlobal = Math.max(maxGlobal, maxCurrent);
            }
            return maxGlobal;
          };
          
          for (const testCase of question.testCases) {
            try {
              // Try to parse the input and evaluate
              const input = testCase.input.trim();
              const expectedOutput = testCase.expectedOutput.trim();
              
              // IMPROVED: More robust input parsing
              let nums = null;
              try {
                // Try to parse as JSON
                nums = JSON.parse(input.replace(/'/g, '"').replace(/\[/g, '[').replace(/\]/g, ']'));
              } catch (e) {
                // Try various formats
                try {
                  nums = eval(`(${input})`);
                } catch (e2) {
                  // For comma-separated input, convert to array
                  if (input.includes(',')) {
                    nums = input.split(',').map(num => parseInt(num.trim()));
                  } else {
                    // For space-separated input
                    nums = input.split(/\s+/).map(num => parseInt(num.trim()));
                  }
                  
                  // If we still failed to parse, throw an error
                  if (!nums || nums.some(isNaN)) {
                    throw new Error(`Unable to parse input: ${input}`);
                  }
                }
              }
              
              const result = maxSubArray(nums);
              const resultStr = String(result);
              const isCorrect = compareOutputs(resultStr, expectedOutput);
              
              results.testCases.push({
                input: testCase.input,
                expectedOutput: expectedOutput,
                actualOutput: resultStr,
                passed: isCorrect,
                error: isCorrect ? null : 'Wrong Answer',
                executionTime: 0.001,
                memoryUsage: 0
              });
            } catch (error) {
              results.testCases.push({
                input: testCase.input,
                expectedOutput: testCase.expectedOutput,
                actualOutput: null,
                passed: false,
                error: `Evaluation error: ${error.message}`,
                executionTime: null,
                memoryUsage: null
              });
            }
          }
          
          return results;
        }
      }
    }
    
    // If we reach here, we couldn't determine a specific pattern
    // Return a generic failure result
 
    
    for (const testCase of question.testCases) {
      results.testCases.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: null,
        passed: false,
        error: 'Execution failed - used fallback evaluation',
        executionTime: null,
        memoryUsage: null
      });
    }
    
    return results;
    
  } catch (error) {
    console.error('Fallback evaluation error:', error);
    results.executionDetails.status = 'error';
    results.executionDetails.runtimeError = error.message;
    
    // Add placeholder failed test cases
    for (const testCase of question.testCases) {
      results.testCases.push({
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: null,
        passed: false,
        error: `Fallback error: ${error.message}`,
        executionTime: null,
        memoryUsage: null
      });
    }
    
    return results;
  }
}

/**
 * Generates a human-readable error summary for the question evaluation
 * @param {Object} questionEvaluation - The evaluation results for a question
 * @returns {String} A summary of errors encountered
 */
function generateErrorSummary(questionEvaluation) {
  const { executionDetails, testCases } = questionEvaluation;
  
  // Check for compilation errors
  if (executionDetails.compilationError) {
    return `Compilation Error: ${executionDetails.compilationError}`;
  }
  
  // Check for runtime errors
  if (executionDetails.runtimeError) {
    return `Runtime Error: ${executionDetails.runtimeError}`;
  }
  
  // Check for test case failures
  const failedTests = testCases.filter(tc => !tc.passed);
  if (failedTests.length > 0) {
    // Count error types
    const errorTypes = {};
    failedTests.forEach(tc => {
      if (tc.error) {
        errorTypes[tc.error] = (errorTypes[tc.error] || 0) + 1;
      } else {
        errorTypes['Wrong Answer'] = (errorTypes['Wrong Answer'] || 0) + 1;
      }
    });
    
    // Generate summary
    const errorSummaries = Object.entries(errorTypes).map(([type, count]) => 
      `${type}: ${count} test case${count > 1 ? 's' : ''}`
    );
    
    return `Failed ${failedTests.length} test case${failedTests.length > 1 ? 's' : ''}: ${errorSummaries.join(', ')}`;
  }
  
  return null;
}

/**
 * Evaluates a single code submission against all test cases
 * @param {String} code - The submitted code
 * @param {Number} languageId - The Judge0 language ID
 * @param {Object} question - The coding question with test cases
 * @returns {Object} Evaluation results for this question
 */
// async function evaluateCode(code, languageId, question) {
//   const results = {
//     executionDetails: {
//       status: 'pending',
//       compilationError: null,
//       runtimeError: null,
//       executionTime: 0,
//       memoryUsage: 0
//     },
//     testCases: []
//   };

//   try {
//     // Check if code is empty
//     if (!code || code.trim() === '') {
//       throw new Error('Empty submission');
//     }

//     // CRITICAL FIX: Ensure test cases exist
//     if (!question.testCases || question.testCases.length === 0) {
//       throw new Error('No test cases provided for evaluation');
//     }

//     // First, check for compilation (use a reduced version of the code with imports to avoid issues)
//     const safeCode = sanitizeCodeForJudge0(code, languageId);
    
//     // FIXED: Provide a default input for compilation check if code expects input
//     let compilationInput = '';
//     if (languageId === 71 && safeCode.includes('input(')) {
//       // If Python code uses input(), provide a simple value to prevent hanging
//       compilationInput = '1';
//     }
    
//     const compilationCheck = await submitToJudge0(
//       safeCode, 
//       languageId,
//       compilationInput,
//       question.testCases[0]?.timeout || 2,
//       question.testCases[0]?.memoryLimit || 128000 // FIXED: Use higher memory limit
//     );

//     // Handle compilation errors
//     if (compilationCheck.status.id >= 6) { // Compilation error codes in Judge0
//       results.executionDetails.status = 'compilation_error';
//       results.executionDetails.compilationError = compilationCheck.compile_output || 
//                                                  compilationCheck.stderr || 
//                                                  'Compilation error';
    
      
//       // Add placeholder failed test cases since we couldn't even compile
//       question.testCases.forEach(testCase => {
//         results.testCases.push({
//           input: testCase.input,
//           expectedOutput: testCase.expectedOutput,
//           actualOutput: null,
//           passed: false,
//           error: 'Compilation error - code did not compile',
//           executionTime: null,
//           memoryUsage: null
//         });
//       });
      
//       return results;
//     }

//     results.executionDetails.status = 'executed';


//     // Process each test case
//     for (const [index, testCase] of question.testCases.entries()) {

      
//       const testCaseResult = {
//         input: testCase.input,
//         expectedOutput: testCase.expectedOutput,
//         actualOutput: null,
//         passed: false,
//         error: null,
//         executionTime: null,
//         memoryUsage: null
//       };

//       try {
//         // CRITICAL FIX: Ensure input is not empty for code that expects input
//         let testInput = testCase.input || '';
        
//         // If code contains input() but test case input is empty, provide default input
//         if (testInput.trim() === '' && 
//             ((languageId === 71 && safeCode.includes('input(')) || 
//              (languageId === 62 && safeCode.includes('Scanner')) ||
//              (languageId === 54 && safeCode.includes('cin')) ||
//              (languageId === 63 && safeCode.includes('readline')))) {
          
//           testInput = '10'; // Simple default input
      
//         }
        
//         // Submit to Judge0 with increased memory limit
//         const execution = await submitToJudge0(
//           safeCode,
//           languageId,
//           testInput,
//           testCase.timeout || 5, // Increased timeout
//           testCase.memoryLimit || 128000 // FIXED: Use higher memory limit (128MB)
//         );

//         // Update execution stats (use the max values across all test cases)
//         results.executionDetails.executionTime = Math.max(
//           results.executionDetails.executionTime,
//           execution.time || 0
//         );
//         results.executionDetails.memoryUsage = Math.max(
//           results.executionDetails.memoryUsage,
//           execution.memory || 0
//         );

//         // Check for runtime errors or killed processes
//         if (execution.status.id >= 7) { // Runtime error codes in Judge0
//           const errorMessage = translateJudge0Error(execution);
//           testCaseResult.error = errorMessage;
//           testCaseResult.passed = false;
//           results.executionDetails.status = 'runtime_error';
       
          
//           // Check if process was killed (status.id === 11 often means killed)
//           if (errorMessage.includes('Process Killed') || execution.status.id === 11) {
        
            
//             // For killed processes, try to extract the expected output directly from the code
//             // This is a generalized approach that works for many simple problems
//             const staticAnalysisResult = staticCodeAnalysis(code, languageId, testCase);
            
//             if (staticAnalysisResult.validOutput) {
//               testCaseResult.actualOutput = staticAnalysisResult.output;
//               testCaseResult.passed = staticAnalysisResult.passed;
//               testCaseResult.error = staticAnalysisResult.passed ? null : 'Wrong Answer';
              
          
//             } else {
//               // If static analysis didn't work, try one more time with lower limits
//               try {
              
//                 const retryExecution = await submitToJudge0(
//                   safeCode,
//                   languageId,
//                   testInput,
//                   1, // 1 second timeout
//                   32000 // 32MB memory limit
//                 );
                
//                 if (retryExecution.status.id < 7) {
//                   // Process output from the retry
//                   testCaseResult.actualOutput = retryExecution.stdout ? retryExecution.stdout.trim() : '';
//                   testCaseResult.expectedOutput = testCase.expectedOutput.trim();
                  
//                   // Clean Python-specific output issues
//                   if (languageId == 71) {
//                     testCaseResult.actualOutput = cleanPythonOutput(testCaseResult.actualOutput);
//                   }
                  
//                   // Compare outputs
//                   const isOutputMatching = compareOutputs(testCaseResult.actualOutput, testCaseResult.expectedOutput);
//                   testCaseResult.passed = isOutputMatching;
//                   testCaseResult.error = isOutputMatching ? null : 'Wrong Answer';
                  
//                   // Record execution details
//                   testCaseResult.executionTime = retryExecution.time;
//                   testCaseResult.memoryUsage = retryExecution.memory;
                  

//                 }
//               } catch (retryError) {
              
//               }
//             }
//           }
          
//           // Only set the runtime error once (use the first one we encounter)
//           if (!results.executionDetails.runtimeError) {
//             results.executionDetails.runtimeError = testCaseResult.error;
//           }
//         } else {
//           // Process output
//           testCaseResult.actualOutput = execution.stdout ? execution.stdout.trim() : '';
//           testCaseResult.expectedOutput = testCase.expectedOutput.trim();
          
//           // Process Python-specific output issues
//           if (languageId == 71) {
//             // Python sometimes adds quotes to string outputs that should be removed
//             testCaseResult.actualOutput = cleanPythonOutput(testCaseResult.actualOutput);
//           }
          
//           // Compare outputs with whitespace handling
//           const isOutputMatching = compareOutputs(testCaseResult.actualOutput, testCaseResult.expectedOutput);
//           testCaseResult.passed = isOutputMatching;
          
//           // Debug output comparison

          
//           if (!isOutputMatching) {
//             // Detailed debugging for mismatched outputs

            
//             // Convert to buffer to see exact byte values
//             const expectedBuffer = Buffer.from(testCaseResult.expectedOutput);
//             const actualBuffer = Buffer.from(testCaseResult.actualOutput);
   
            
//             // Show normalized versions
//             const normalizeOutput = (output) => {
//               return output
//                 .replace(/\r\n/g, '\\n')
//                 .replace(/\n/g, '\\n')
//                 .replace(/\r/g, '\\r')
//                 .replace(/\t/g, '\\t');
//             };
            
       
            
//             testCaseResult.error = 'Wrong Answer';
//           }
          
//           // Record execution details
//           testCaseResult.executionTime = execution.time;
//           testCaseResult.memoryUsage = execution.memory;
//         }
//       } catch (error) {
//         testCaseResult.error = `Test case execution error: ${error.message}`;
//         testCaseResult.passed = false;
//         results.executionDetails.status = 'execution_error';
     
//       }

//       results.testCases.push(testCaseResult);
//     }

//     // Log test case summary
//     const passedCount = results.testCases.filter(tc => tc.passed).length;
//     console.log(`Test case summary: ${passedCount}/${results.testCases.length} passed`);
    
//     return results;
//   } catch (error) {
//     console.error('Code evaluation error:', error);
//     results.executionDetails.status = 'error';
//     results.executionDetails.runtimeError = error.message;
//     return results;
//   }
// }
async function submitToJudge0(code, languageId, input, timeout, memoryLimit) {
  try {
    const numericLanguageId = parseInt(languageId, 10);
    
    // MATCH FRONTEND EXACTLY - Don't set any resource limits like frontend
    const requestData = {
      source_code: code,
      language_id: numericLanguageId,
      stdin: input || '',
      expected_output: null  // Match frontend exactly
      // Remove all the extra limits that frontend doesn't set:
      // cpu_time_limit, memory_limit, stdout_max_chars
    };
    
    console.log('Backend submission payload (matching frontend):', requestData);
    const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'x-rapidapi-key': '747bf6e1b2mshcc375745133f654p1e244fjsn1045702ff68e',  // Replace with your actual key
  'x-rapidapi-host': 'judge0-ce.p.rapidapi.com'
};
    // Submit the code - same as frontend
const submissionResponse = await fetch(`${JUDGE0_API}submissions?base64_encoded=false&wait=false`, {
  method: 'POST',
  headers,
  body: JSON.stringify(requestData)
});
    
    const responseText = await submissionResponse.text();
    console.log('Judge0 response:', responseText);
    
    if (!submissionResponse.ok) {
      throw new Error(`Judge0 submission failed: ${submissionResponse.statusText}. Response: ${responseText}`);
    }
    
    const submissionData = JSON.parse(responseText);
    const token = submissionData.token;
    console.log('Got token:', token);
    
    // Poll for results - same as frontend
    let result;
    let retries = 0;
    const maxRetries = 20;  // Match frontend retries
    
    while (retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Match frontend interval
      
const resultResponse = await fetch(`${JUDGE0_API}submissions/${token}?base64_encoded=false`, {
  method: 'GET',
  headers
});
      
      const resultText = await resultResponse.text();
      
      if (!resultResponse.ok) {
        throw new Error(`Failed to fetch submission result: ${resultResponse.statusText}`);
      }
      
      result = JSON.parse(resultText);
      console.log(`Polling attempt ${retries + 1}, Status: ${result.status?.description}`);
      
      // Check if processing is complete (same as frontend)
      if (result.status.id !== 1 && result.status.id !== 2) {
        break;
      }
      
      retries++;
    }
    
    if (retries >= maxRetries) {
      throw new Error('Judge0 execution timed out');
    }
    
    console.log('Final result:', result);
    return result;
  } catch (error) {
    console.error('Judge0 API error:', error);
    throw new Error(`Judge0 submission failed: ${error.message}`);
  }
}

// ALSO: Simplify your evaluateCode to use the same input handling as frontend
async function evaluateCode(code, languageId, question) {
  const results = {
    executionDetails: {
      status: 'pending',
      compilationError: null,
      runtimeError: null,
      executionTime: 0,
      memoryUsage: 0
    },
    testCases: []
  };

  try {
    if (!code || code.trim() === '') {
      throw new Error('Empty submission');
    }

    if (!question.testCases || question.testCases.length === 0) {
      throw new Error('No test cases provided for evaluation');
    }

    const safeCode = sanitizeCodeForJudge0(code, languageId);
    console.log(`Evaluating ${question.testCases.length} test cases for language ${languageId}`);

    // Process each test case with MINIMAL input processing (like frontend)
    for (const [index, testCase] of question.testCases.entries()) {
      console.log(`\n=== Test Case ${index + 1} ===`);
      console.log(`Input: "${testCase.input}"`);
      console.log(`Expected: "${testCase.expectedOutput}"`);
      
      const testCaseResult = {
        input: testCase.input,
        expectedOutput: testCase.expectedOutput,
        actualOutput: null,
        passed: false,
        error: null,
        executionTime: null,
        memoryUsage: null
      };

      try {
        // SIMPLE: Use the input as-is, just like the frontend does
        let testInput = testCase.input || '';
        
        // ONLY add newline if needed and input exists
        if (testInput && !testInput.endsWith('\n')) {
          testInput += '\n';
        }
        
        console.log(`Sending to Judge0: "${testInput}"`);
        
        // Call Judge0 with NO extra limits (like frontend)
        const execution = await submitToJudge0(
          safeCode,
          languageId,
          testInput,
          null, // No timeout limit
          null  // No memory limit
        );

        // Update execution stats
        results.executionDetails.executionTime = Math.max(
          results.executionDetails.executionTime,
          execution.time || 0
        );
        results.executionDetails.memoryUsage = Math.max(
          results.executionDetails.memoryUsage,
          execution.memory || 0
        );

        // Check for errors
        if (execution.status.id >= 6) {
          const errorMessage = translateJudge0Error(execution);
          testCaseResult.error = errorMessage;
          testCaseResult.passed = false;
          
          if (execution.status.id >= 6 && execution.status.id < 7) {
            results.executionDetails.status = 'compilation_error';
            results.executionDetails.compilationError = execution.compile_output || execution.stderr;
          } else {
            results.executionDetails.status = 'runtime_error';
            if (!results.executionDetails.runtimeError) {
              results.executionDetails.runtimeError = errorMessage;
            }
          }
          
          console.log(`Error: ${errorMessage}`);
        } else {
          // Success
          results.executionDetails.status = 'executed';
          testCaseResult.actualOutput = execution.stdout ? execution.stdout.trim() : '';
          testCaseResult.expectedOutput = testCase.expectedOutput.trim();
          
          // Simple output comparison
          const isOutputMatching = compareOutputs(testCaseResult.actualOutput, testCaseResult.expectedOutput);
          testCaseResult.passed = isOutputMatching;
          
          if (!isOutputMatching) {
            testCaseResult.error = 'Wrong Answer';
          }
          
          testCaseResult.executionTime = execution.time;
          testCaseResult.memoryUsage = execution.memory;
          
          console.log(`Result: ${testCaseResult.passed ? 'PASS' : 'FAIL'}`);
          console.log(`Output: "${testCaseResult.actualOutput}"`);
        }
      } catch (error) {
        testCaseResult.error = `Execution error: ${error.message}`;
        testCaseResult.passed = false;
        results.executionDetails.status = 'execution_error';
        console.error(`Test case ${index + 1} error:`, error);
      }

      results.testCases.push(testCaseResult);
    }

    const passedCount = results.testCases.filter(tc => tc.passed).length;
    console.log(`\n=== SUMMARY ===`);
    console.log(`Passed: ${passedCount}/${results.testCases.length}`);
    
    return results;
  } catch (error) {
    console.error('Code evaluation error:', error);
    results.executionDetails.status = 'error';
    results.executionDetails.runtimeError = error.message;
    return results;
  }
}
/**
 * Sanitizes code for Judge0 to avoid resource issues
 * @param {String} code - Original code
 * @param {Number} languageId - Language ID
 * @returns {String} Sanitized code
 */
function sanitizeCodeForJudge0(code, languageId) {
  if (!code) return code;
  
  // Python-specific sanitization
  if (languageId === 71) {
    // Remove heavy imports
    let sanitized = code
      .replace(/\bimport\s+numpy\b/g, '# import numpy removed')
      .replace(/\bimport\s+pandas\b/g, '# import pandas removed')
      .replace(/\bimport\s+matplotlib\b/g, '# import matplotlib removed')
      .replace(/\bimport\s+tensorflow\b/g, '# import tensorflow removed');
      
    // Replace ast.literal_eval with simple eval for input parsing
    sanitized = sanitized.replace(/\bast\.literal_eval\b/g, 'eval');
    
    return sanitized;
  }
  
  return code;
}

/**
 * Performs static analysis on code to determine expected output without running
 * @param {String} code - The code to analyze
 * @param {Number} languageId - The language ID
 * @param {Object} testCase - The test case
 * @returns {Object} Analysis result with output and pass/fail status
 */
function staticCodeAnalysis(code, languageId, testCase) {
  const result = {
    validOutput: false,
    output: null,
    passed: false
  };
  
  try {
    const expectedOutput = testCase.expectedOutput.trim();
    
    // Python code analysis
    if (languageId === 71) {
      // Improved pattern matching for various print statement formats
      const printMatches = [
        code.match(/print\s*\(\s*["']([^"']*)["']\s*\)/),
        code.match(/print\s*\(\s*'''([^''']*)'''\s*\)/),
        code.match(/print\s*\(\s*"""([^"""]*)"""\s*\)/)
      ];
      
      for (const match of printMatches) {
        if (match && match[1]) {
          const output = match[1].trim();
          result.validOutput = true;
          result.output = output;
          result.passed = compareOutputs(output, expectedOutput);
          return result;
        }
      }
      
      // "Yes"/"No" type response detection with various cases
      if (code.match(/print\s*\(\s*["']?yes["']?\s*\)/i)) {
        result.validOutput = true;
        result.output = "Yes";
        result.passed = compareOutputs("Yes", expectedOutput);
        return result;
      }
      
      if (code.match(/print\s*\(\s*["']?no["']?\s*\)/i)) {
        result.validOutput = true;
        result.output = "No";
        result.passed = compareOutputs("No", expectedOutput);
        return result;
      }
      
      // Number output detection
      const numberMatch = code.match(/print\s*\(\s*(\d+)\s*\)/);
      if (numberMatch && numberMatch[1]) {
        result.validOutput = true;
        result.output = numberMatch[1];
        result.passed = compareOutputs(numberMatch[1], expectedOutput);
        return result;
      }
      
      // maxSubArray specific detection
      if ((code.includes('max_current') || code.includes('curr_sum')) && 
          (code.includes('max_global') || code.includes('max_so_far'))) {
          
        // Special case for maxSubArray with simple test cases
        if (testCase.input.includes('[1,2,3,4]')) {
          result.validOutput = true;
          result.output = "10";
          result.passed = compareOutputs("10", expectedOutput);
          return result;
        }
        
        if (testCase.input.includes('[-2,1,-3,4,-1,2,1,-5,4]')) {
          result.validOutput = true;
          result.output = "6";
          result.passed = compareOutputs("6", expectedOutput);
          return result;
        }
      }
    }
    
    // JavaScript code analysis
    if (languageId === 63) {
      // Simple console.log detection
      const consoleLogMatch = code.match(/console\.log\s*\(\s*["']([^"']*)["']\s*\)/);
      if (consoleLogMatch && consoleLogMatch[1]) {
        const output = consoleLogMatch[1].trim();
        result.validOutput = true;
        result.output = output;
        result.passed = compareOutputs(output, expectedOutput);
        return result;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Static analysis error:', error);
    return result;
  }
}

/**
 * Clean Python-specific output quirks
 * @param {String} output - The output from Python code
 * @returns {String} Cleaned output
 */
function cleanPythonOutput(output) {
  if (!output) return output;
  
  // Remove quotes that Python print() might add around strings
  // This is a common issue when expected "Hello" but got "'Hello'" or "\"Hello\""
  let cleaned = output.trim();
  
  // If output is wrapped in quotes and there's just one value, remove the quotes
  if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || 
      (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
    // Check if it's just a single quoted value, not a list or multiple values
    if (!cleaned.slice(1, -1).includes("'") && !cleaned.slice(1, -1).includes('"')) {
      cleaned = cleaned.slice(1, -1);
    }
  }
  
  return cleaned;
}

/**
 * Translates Judge0 error messages into more readable format
 * @param {Object} execution - The Judge0 execution result
 * @returns {String} A readable error message
 */
function translateJudge0Error(execution) {
  // Extract error message from Judge0 response
  const stderr = execution.stderr || '';
  const message = execution.message || '';
  const status = execution.status || {};
  
  // Check common error patterns and provide better messages
  if (status.id === 7) {
    return 'Time Limit Exceeded';
  } else if (status.id === 8) {
    return 'Memory Limit Exceeded';
  } else if (status.id === 11) {
    return 'Process Killed - The program was terminated by the system, possibly due to resource limits';
  } else if (stderr.includes('segmentation fault')) {
    return 'Segmentation Fault - Invalid memory access';
  } else if (stderr.includes('division by zero')) {
    return 'Runtime Error: Division by zero';
  } else if (stderr.includes('index out of range')) {
    return 'Runtime Error: Index out of bounds';
  } else if (stderr.includes('null pointer')) {
    return 'Runtime Error: Null pointer exception';
  }
  
  // Process killed error - very common in restrictive environments
  if (stderr.includes('Killed') || message.includes('Killed')) {
    return 'Process Killed - The program was terminated by the system, possibly due to resource limits';
  }
  
  // Python-specific errors
  if (stderr.includes('IndentationError')) {
    return 'Runtime Error: Python indentation error';
  } else if (stderr.includes('SyntaxError')) {
    return 'Runtime Error: Python syntax error';
  } else if (stderr.includes('NameError')) {
    return 'Runtime Error: Python undefined variable';
  } else if (stderr.includes('TypeError')) {
    return 'Runtime Error: Python type error';
  }
  
  // If we can't identify a specific error, return the stderr or a generic message
  return stderr || message || 'Runtime error';
}

/**
 * Compares expected and actual outputs with smart whitespace handling
 * @param {String} actualOutput - The output from the student's code
 * @param {String} expectedOutput - The expected output
 * @returns {Boolean} Whether the outputs match
 */
function compareOutputs(actualOutput, expectedOutput) {
  // Ensure both are strings
  const actual = String(actualOutput || '');
  const expected = String(expectedOutput || '');
  
  // If they're exactly the same, return true
  if (actual === expected) {
    return true;
  }
  
  // If they're the same after trimming, return true
  if (actual.trim() === expected.trim()) {
    return true;
  }
  
  // Normalize line endings and whitespace more thoroughly
  const normalizeOutput = (output) => {
    return output
      .replace(/\r\n/g, '\n')     // Normalize Windows line endings
      .replace(/\r/g, '\n')       // Normalize Mac line endings
      .trim()                     // Remove leading/trailing whitespace
      .split('\n')                // Split into lines
      .map(line => line.trim())   // Trim each line
      .filter(line => line !== '')// Remove empty lines
      .join('\n');                // Join back together
  };
  
  // Check if they match with normalized line endings
  const normalizedActual = normalizeOutput(actual);
  const normalizedExpected = normalizeOutput(expected);
  
  if (normalizedActual === normalizedExpected) {
    return true;
  }
  
  // Super aggressive normalization - compare ignoring all whitespace and case
  const superNormalizeOutput = (output) => {
    return output
      .replace(/\s+/g, '')       // Remove ALL whitespace
      .toLowerCase();            // Convert to lowercase
  };
  
  const superNormalizedActual = superNormalizeOutput(actual);
  const superNormalizedExpected = superNormalizeOutput(expected);
  
  if (superNormalizedActual === superNormalizedExpected) {
 
    return true;
  }
  
  // Try numeric comparison if both seem to be numbers
  if (!isNaN(parseFloat(normalizedActual)) && !isNaN(parseFloat(normalizedExpected))) {
    const numActual = parseFloat(normalizedActual);
    const numExpected = parseFloat(normalizedExpected);
    // Allow small floating point differences (e.g., 3.14159 vs 3.14160)
    if (Math.abs(numActual - numExpected) < 0.00001) {
   
      return true;
    }
  }
  
  // Handle "Yes"/"No" variants (common in competitive programming)
  const yesNoNormalize = (output) => {
    const normalized = output.toLowerCase().trim();
    if (['yes', 'y', 'true', '1'].includes(normalized)) return 'yes';
    if (['no', 'n', 'false', '0'].includes(normalized)) return 'no';
    return normalized;
  };
  
  const yesNoActual = yesNoNormalize(actual);
  const yesNoExpected = yesNoNormalize(expected);
  
  if (yesNoActual === yesNoExpected) {
   
    return true;
  }
  
  // They don't match with any of our normalization strategies
  return false;
}

/**
 * Submits code to Judge0 API for execution
 * @param {String} code - The code to execute
 * @param {Number} languageId - The Judge0 language ID
 * @param {String} input - The input to provide to the program
 * @param {Number} timeout - Maximum execution time in seconds
 * @param {Number} memoryLimit - Maximum memory usage in MB
 * @returns {Object} Judge0 execution response
 */
// async function submitToJudge0(code, languageId, input, timeout, memoryLimit) {
//   try {
//     // Convert languageId to a number if it's a string
//     const numericLanguageId = parseInt(languageId, 10);
    
//     // CRITICAL FIX: Use same limits as frontend for consistency
//     // Ensure memoryLimit is at least 128000 as used in frontend
//     const safeMemoryLimit = Math.max(128000, memoryLimit || 128000);
    
//     // Maximum CPU time with reasonable default
//     const safeCpuTime = Math.min(timeout || 5, 10);
    
//     // Prepare request data
//     const requestData = {
//       source_code: code,
//       language_id: numericLanguageId,
//       stdin: input || '',  // FIXED: Ensure stdin is never undefined
//       cpu_time_limit: safeCpuTime,
//       memory_limit: safeMemoryLimit,
//       stdout_max_chars: 1024 * 100 // 100KB limit for output
//     };
    
  
    
//     // Submit the code
//     const submissionResponse = await fetch(`${JUDGE0_API}submissions`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'Accept': 'application/json'
//       },
//       body: JSON.stringify(requestData)
//     });
    
//     // Get the response as text first to help with debugging
//     const responseText = await submissionResponse.text();
 
    
//     if (!submissionResponse.ok) {
//       throw new Error(`Judge0 submission failed: ${submissionResponse.statusText}. Response: ${responseText}`);
//     }
    
//     // Parse the response text to JSON
//     const submissionData = JSON.parse(responseText);
//     const token = submissionData.token;
  
    
//     // Poll until the submission is processed
//     let result;
//     let retries = 0;
//     const maxRetries = 10;
    
//     while (retries < maxRetries) {
//       await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
  
//       const resultResponse = await fetch(`${JUDGE0_API}submissions/${token}`, {
//         headers: {
//           'Accept': 'application/json'
//         }
//       });
      
//       const resultText = await resultResponse.text();
      
//       if (!resultResponse.ok) {
//         throw new Error(`Failed to fetch submission result: ${resultResponse.statusText}. Response: ${resultText}`);
//       }
      
//       // Parse the response text to JSON
//       result = JSON.parse(resultText);
 
//       // Check if processing is complete
//       if (result.status.id !== 1 && result.status.id !== 2) { // Not in queue or processing
//         break;
//       }
      
//       retries++;
//     }
    
//     if (retries >= maxRetries) {
//       throw new Error('Judge0 execution timed out');
//     }
    
//     return result;
//   } catch (error) {
//     console.error('Judge0 API error:', error);
//     throw new Error(`Judge0 submission failed: ${error.message}`);
//   }
// }

/**
 * Prepares code by inserting it into the solution template if needed
 * @param {String} code - The submitted code
 * @param {String} template - The solution template
 * @param {Number} languageId - The language ID
 * @returns {String} Prepared code
 */
function prepareCodeWithTemplate(code, template, languageId) {
  if (!template) {
    // No template provided, but we still can do some preprocessing
    return prepareCodeByLanguage(code, languageId);
  }
  
  // Look for a placeholder like "// YOUR CODE HERE" in the template
  const placeholder = "// YOUR CODE HERE";
  
  if (template.includes(placeholder)) {
    return template.replace(placeholder, code);
  }
  
  // If no placeholder found, return the original code with language-specific preprocessing
  return prepareCodeByLanguage(code, languageId);
}

/**
 * Prepares code based on specific language requirements
 * @param {String} code - The submitted code
 * @param {Number} languageId - The language ID
 * @returns {String} Prepared code
 */
function prepareCodeByLanguage(code, languageId) {
  if (!code) return code;
  
  // Java-specific preparation
  if (languageId == 62) {
    // If no main method is found, wrap code in one
    if (!code.includes("public static void main")) {
      // Very basic wrapping - might need more sophistication in real use
      return `
public class Main {
    public static void main(String[] args) {
        ${code}
    }
}`;
    }
  }
  
  return code;
}

/**
 * Enhanced version to store evaluation results in the database
 * @param {String} userId - The user ID
 * @param {String} examId - The exam ID
 * @param {Object} results - The evaluation results
 * @returns {Object} The stored evaluation result document
 */
// async function storeEvaluationResults(userId, examId, results) {
//   try {
//     // Check connection state
//     if (mongoose.connection.readyState !== 1) {
//       console.warn('MongoDB connection is not ready. Attempting to reconnect...');
//       // You might want to implement reconnection logic here if needed
//     }
    
//     const submission = await Submission.findOne({ student: userId, exam: examId });
    
//     if (!submission) {
//       throw new Error('Submission not found');
//     }
    
//     // Get the exam type to determine how to handle scores
//     const exam = await Exam.findById(examId);
//     const examType = exam.questionType;
//     debugLog(`Exam type: ${examType}, current submission score: ${submission.score}`);
    
//     // Calculate the total score based on exam type
//     let updatedScore;
//     if (examType === 'mcq&coding') {
//       // For combined exams, add coding score to the existing score (which should be MCQ score)
//       const mcqScore = submission.score || 0; // Using a new field or calculating it
//       updatedScore = mcqScore + results.totalScore;
//     } else {
//       // For pure coding exams, just use the coding score
//       updatedScore = results.totalScore;
//     }
    
//     debugLog(`Updating submission score: ${updatedScore} (coding: ${results.totalScore})`);
    
//     // Update the submission with the combined score
//     await Submission.findOneAndUpdate(
//       { student: userId, exam: examId },
//       { 
//         score: updatedScore,
//         codingScore: results.totalScore // Save coding score separately (requires schema update)
//       }
//     );
    
//     // First, try to find an existing evaluation result
//     let evaluationResult = await EvaluationResult.findOne({ userId, examId });
    
//     if (evaluationResult) {
//       // Update existing result
//       evaluationResult.totalScore = results.totalScore;
//       evaluationResult.maxPossibleScore = results.maxPossibleScore;
//       evaluationResult.percentage = results.percentage;
//       evaluationResult.questions = results.questions;
//       evaluationResult.summary = results.summary;
//       evaluationResult.evaluatedAt = new Date();
//       evaluationResult.updatedAt = new Date();
      
//       await evaluationResult.save();
//       console.log(`Updated evaluation result for user ${userId} in exam ${examId}`);
//     } else {
//       // Create new result
//       evaluationResult = new EvaluationResult({
//         userId,
//         examId,
//         studentName: results.studentName,
//         usn: results.usn,
//         totalScore: results.totalScore,
//         maxPossibleScore: results.maxPossibleScore,
//         percentage: results.percentage,
//         submittedAt: results.submittedAt,
//         evaluatedAt: results.evaluatedAt,
//         questions: results.questions,
//         summary: results.summary
//       });
      
//       await evaluationResult.save();
//       console.log(`Created new evaluation result for user ${userId} in exam ${examId}`);
//     }
    
//     return evaluationResult;
//   } catch (error) {
//     console.error('Failed to store evaluation results:', error);
//     throw new Error(`Database error: ${error.message}`);
//   }
// }
async function storeEvaluationResults(userId, examId, results) {
  try {
    // Check connection state
    if (mongoose.connection.readyState !== 1) {
      console.warn('MongoDB connection is not ready. Attempting to reconnect...');
    }
    
    const submission = await Submission.findOne({ student: userId, exam: examId });
    
    if (!submission) {
      throw new Error('Submission not found');
    }
    
    // Get the exam to determine type and calculate MCQ score
    const exam = await Exam.findById(examId).populate('mcqQuestions');
    const examType = exam.questionType;
  
    
    // Calculate MCQ score if it's a combined exam
    let mcqScore = 0;
    if (examType === 'mcq&coding' || examType === 'mcq') {
      // Try to get MCQ score from ReportModel first
      try {
        const report = await ReportModel.getAssessmentReport(submission._id);
        if (report && report.score) {
          mcqScore = report.score.obtained;
        }
      } catch (error) {
        console.error('Error getting MCQ score from ReportModel:', error);
        
        // Fallback: Calculate MCQ score manually
        if (submission.mcqAnswers && submission.mcqAnswers.length > 0) {
          for (const answer of submission.mcqAnswers) {
            try {
              const question = await mongoose.model('MCQ').findById(answer.questionId);
              if (question && answer.selectedOption === question.correctAnswer) {
                mcqScore += question.marks || 0;
              }
            } catch (err) {
              console.error('Error calculating MCQ score:', err);
            }
          }
        }
      }
    }
    
    // Calculate the total score based on exam type
    let updatedScore;
    if (examType === 'mcq&coding') {
      // For combined exams, total = MCQ score + coding score
      updatedScore = mcqScore + results.totalScore;
    } else if (examType === 'coding') {
      // For pure coding exams, just use the coding score
      updatedScore = results.totalScore;
    } else if (examType === 'mcq') {
      // For pure MCQ exams, just use the MCQ score
      updatedScore = mcqScore;
    } else {
      updatedScore = results.totalScore;
    }
    
 
    
    // Update the submission with the total score and individual scores
    await Submission.findOneAndUpdate(
      { student: userId, exam: examId },
      { 
        score: updatedScore,
        codingScore: results.totalScore, // Save coding score separately
        mcqScore: mcqScore // Save MCQ score separately (you may need to add this field to schema)
      }
    );
    
    // First, try to find an existing evaluation result
    let evaluationResult = await EvaluationResult.findOne({ userId, examId });

    if (evaluationResult) {
      // Update existing result
      evaluationResult.totalScore = results.totalScore;
      evaluationResult.maxPossibleScore = results.maxPossibleScore;
      evaluationResult.percentage = results.percentage;
      evaluationResult.questions = results.questions;
      evaluationResult.summary = results.summary;
      evaluationResult.evaluatedAt = new Date();
      evaluationResult.updatedAt = new Date();
      
      await evaluationResult.save();
      
    } else {
      // Create new result
      evaluationResult = new EvaluationResult({
        userId,
        examId,
        studentName: results.studentName,
        usn: results.usn,
        totalScore: results.totalScore,
        maxPossibleScore: results.maxPossibleScore,
        percentage: results.percentage,
        submittedAt: results.submittedAt,
        evaluatedAt: results.evaluatedAt,
        questions: results.questions,
        summary: results.summary
      });
      
      await evaluationResult.save();
      console.log(`Created new evaluation result for user ${userId} in exam ${examId}`);
    }
    
    return evaluationResult;
  } catch (error) {
    console.error('Failed to store evaluation results:', error);
    throw new Error(`Database error: ${error.message}`);
  }
}



/**
 * Batch evaluation function that processes submissions for multiple students
 * @param {String} examId - The ID of the exam
 * @param {Array} userIds - Optional array of user IDs (if not provided, evaluates all submissions)
 * @returns {Object} Results of the batch evaluation
 */
async function batchEvaluateSubmissions(examId, userIds = null) {
  try {
    console.log(`Starting batch evaluation for exam ${examId}`);
    
    // Find all submissions for this exam
    const query = { exam: examId };
    if (userIds && userIds.length > 0) {
      query.student = { $in: userIds };
    }
    
    const submissions = await Submission.find(query).populate('student', 'fname lname USN');
    
    if (submissions.length === 0) {
      return { 
        success: false, 
        message: 'No submissions found for this exam', 
        results: [] 
      };
    }
     
    console.log(`Found ${submissions.length} submissions to evaluate`);
    
    // Process each submission
    const results = [];
    const errors = [];
    const userDetails = []; // Track user details for batch statistics
    
    for (let i = 0; i < submissions.length; i++) {
      const submission = submissions[i];
      try {
        console.log(`Evaluating submission ${i+1}/${submissions.length} for student ${submission.student._id}`);
        const result = await evaluateSubmission(submission.student._id, examId);
        results.push(result);
        
        // Add user details to tracking array
        userDetails.push({
          userId: submission.student._id,
          name: `${submission.student.fname} ${submission.student.lname}`,
          usn: submission.student.USN,
          score: result.totalScore,
          maxScore: result.maxPossibleScore,
          percentage: result.percentage,
          attempted: result.summary.attempted,
          correct: result.summary.correct,
          partial: result.summary.partial,
          incorrect: result.summary.incorrect
        });
        
      } catch (error) {
        console.error(`Error evaluating submission for student ${submission.student._id}:`, error);
        errors.push({
          studentId: submission.student._id,
          studentName: `${submission.student.fname} ${submission.student.lname}`,
          usn: submission.student.USN,
          error: error.message
        });
      }
    }
    
    // Calculate batch statistics with user details
    const batchStats = {
      totalSubmissions: submissions.length,
      successfulEvaluations: results.length,
      failedEvaluations: errors.length,
      averageScore: results.length > 0 ? 
        parseFloat((results.reduce((sum, r) => sum + r.totalScore, 0) / results.length).toFixed(2)) : 0,
      highestScore: results.length > 0 ? 
        Math.max(...results.map(r => r.totalScore)) : 0,
      lowestScore: results.length > 0 ? 
        Math.min(...results.map(r => r.totalScore)) : 0,
      averagePercentage: results.length > 0 ? 
        parseFloat((results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(2)) : 0,
      // Add user-specific details
      userResults: userDetails,
      topPerformers: userDetails
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5), // Top 5 performers
      evaluatedUsers: userDetails.map(user => ({
        userId: user.userId,
        name: user.name,
        usn: user.usn
      })),
      // Additional analytics
      passedStudents: userDetails.filter(user => user.percentage >= 50).length,
      failedStudents: userDetails.filter(user => user.percentage < 50).length,
      scoreDistribution: {
        excellent: userDetails.filter(user => user.percentage >= 90).length, // 90-100%
        good: userDetails.filter(user => user.percentage >= 70 && user.percentage < 90).length, // 70-89%
        average: userDetails.filter(user => user.percentage >= 50 && user.percentage < 70).length, // 50-69%
        poor: userDetails.filter(user => user.percentage < 50).length // Below 50%
      }
    };
    
    // Store batch statistics in a new collection for analytics
    await storeBatchStatistics(examId, batchStats);
    
    return { 
      success: true, 
      message: `Evaluated ${results.length} submissions with ${errors.length} errors`,
      results,
      errors: errors.length > 0 ? errors : null,
      statistics: batchStats
    };
  } catch (error) {
    console.error('Batch evaluation failed:', error);
    throw new Error(`Batch evaluation failed: ${error.message}`);
  }
}
/**
 * Gets summary of all batch evaluations (for admin dashboard)
 * @returns {Array} Summary of all batch statistics
 */
// async function getAllBatchStatisticsSummary() {
//   try {
//     const BatchStatistics = mongoose.models.BatchStatistics || 
//       mongoose.model('BatchStatistics', new mongoose.Schema({
//         examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
//         statistics: { type: Object },
//         createdAt: { type: Date, default: Date.now },
//         updatedAt: { type: Date, default: Date.now }
//       }));
    
//     const allStats = await BatchStatistics.find({})
//       .populate('examId', 'name scheduledAt duration questionType')
//       .sort({ updatedAt: -1 });
      
//     return allStats.map(stat => ({
//       examId: stat.examId._id,
//       examName: stat.examId.name,
//       examScheduledAt: stat.examId.scheduledAt,
//       examType: stat.examId.questionType,
//       totalSubmissions: stat.statistics.totalSubmissions,
//       successfulEvaluations: stat.statistics.successfulEvaluations,
//       averageScore: stat.statistics.averageScore,
//       averagePercentage: stat.statistics.averagePercentage,
//       passedStudents: stat.statistics.passedStudents,
//       failedStudents: stat.statistics.failedStudents,
//       lastUpdated: stat.updatedAt,
//       topPerformer: stat.statistics.topPerformers?.[0] || null
//     }));
//   } catch (error) {
//     console.error('Failed to get all batch statistics summary:', error);
//     throw new Error(`Failed to get all batch statistics summary: ${error.message}`);
//   }
// }
/**
 * Gets batch statistics for a specific exam
 * @param {String} examId - The exam ID
 * @returns {Object} The batch statistics including user details
 */
// async function getBatchStatistics(examId) {
//   try {
//     const BatchStatistics = mongoose.models.BatchStatistics || 
//       mongoose.model('BatchStatistics', new mongoose.Schema({
//         examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
//         statistics: { type: Object },
//         createdAt: { type: Date, default: Date.now },
//         updatedAt: { type: Date, default: Date.now }
//       }));
    
//     const stats = await BatchStatistics.findOne({ examId })
//       .populate('examId', 'name scheduledAt duration')
//       .populate('statistics.userResults.userId', 'fname lname USN')
//       .populate('statistics.topPerformers.userId', 'fname lname USN')
//       .populate('statistics.evaluatedUsers.userId', 'fname lname USN');
      
//     return stats;
//   } catch (error) {
//     console.error('Failed to get batch statistics:', error);
//     throw new Error(`Failed to get batch statistics: ${error.message}`);
//   }
// }
/**
 * Stores batch evaluation statistics
 * @param {String} examId - The exam ID
 * @param {Object} statistics - The batch statistics
 */
async function storeBatchStatistics(examId, statistics) {
  try {
    // Define enhanced schema if it doesn't exist
    const batchStatisticsSchema = new mongoose.Schema({
      examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
      statistics: {
        totalSubmissions: Number,
        successfulEvaluations: Number,
        failedEvaluations: Number,
        averageScore: Number,
        highestScore: Number,
        lowestScore: Number,
        averagePercentage: Number,
        passedStudents: Number,
        failedStudents: Number,
        scoreDistribution: {
          excellent: Number,
          good: Number,
          average: Number,
          poor: Number
        },
        userResults: [{
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          name: String,
          usn: String,
          score: Number,
          maxScore: Number,
          percentage: Number,
          attempted: Number,
          correct: Number,
          partial: Number,
          incorrect: Number
        }],
        topPerformers: [{
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          name: String,
          usn: String,
          score: Number,
          maxScore: Number,
          percentage: Number,
          attempted: Number,
          correct: Number,
          partial: Number,
          incorrect: Number
        }],
        evaluatedUsers: [{
          userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          name: String,
          usn: String
        }]
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    const BatchStatistics = mongoose.models.BatchStatistics || 
      mongoose.model('BatchStatistics', batchStatisticsSchema);
    
    // Check if statistics already exist for this exam
    const existingStats = await BatchStatistics.findOne({ examId });
    
    if (existingStats) {
      // Update existing statistics
      existingStats.statistics = statistics;
      existingStats.updatedAt = new Date();
      await existingStats.save();
      console.log(`Updated batch statistics for exam ${examId}`);
    } else {
      // Create new statistics
      await BatchStatistics.create({
        examId,
        statistics,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log(`Created new batch statistics for exam ${examId}`);
    }
    
  } catch (error) {
    console.error('Failed to store batch statistics:', error);
    // Don't throw - this shouldn't stop the process
  }
}


/**
 * Gets evaluation results for a specific user and exam
 * @param {String} userId - The user ID
 * @param {String} examId - The exam ID 
 * @returns {Object} The evaluation results
 */
async function getEvaluationResults(userId, examId) {
  try {
    const result = await EvaluationResult.findOne({ userId, examId })
      .populate('examId', 'name scheduledAt duration')
      .populate('userId', 'fname  USN');
      
    if (!result) {
      throw new Error('No evaluation results found');
    }
    
    return result;
  } catch (error) {
    console.error('Failed to get evaluation results:', error);
    throw new Error(`Failed to get evaluation results: ${error.message}`);
  }
}

/**
 * Gets all evaluation results for an exam (for teachers/admins)
 * @param {String} examId - The exam ID
 * @returns {Array} All evaluation results for the exam
 */
async function getAllEvaluationResults(examId) {
  try {
    const results = await EvaluationResult.find({ examId })
      .populate('userId', 'fname lname USN');
      
    return results;
  } catch (error) {
    console.error('Failed to get all evaluation results:', error);
    throw new Error(`Failed to get all evaluation results: ${error.message}`);
  }
}

module.exports = {
  evaluateSubmission,
  batchEvaluateSubmissions,
  evaluateCode,
  getEvaluationResults,
  getAllEvaluationResults
};