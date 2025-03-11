const User = require("./../models/usermodel");
const Exam = require("../models/Exam");
const Submission = require("./../models/SubmissionSchema")
// exports.getcontrol = async (req, res) => {
//     if (req.isAuthenticated()) {
//         try {
//             const student = await User.findById(req.user._id); // Get the logged-in student

//             if (!student) return res.status(404).json({ error: "Student not found" });

//             // Get the current date and time
//             const currentTime = new Date();
//             // Find exams that match the student's semester and department and are within the valid schedule range
//             const exams = await Exam.find({
//                 semester: student.Semester,
//                 departments: student.Department,
//                 scheduleTill: { $gte: currentTime } // Exam should not have ended
//             });
            
//             console.log(exams);
            
//             const Userprofile = await User.findById(req.user.id);
//             res.render("dashboard", { 
//                 pic: Userprofile.imageurl, 
//                 logged_in: "true", 
//                 exams, 
//                 user: req.user 
//             });

//         } catch (error) {
//             res.status(500).json({ error: "Server Error" });
//         }
//     } else {
//         res.redirect("/");
//     }
// };
exports.getcontrol = async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const student = await User.findById(req.user._id); // Get the logged-in student

            if (!student) return res.status(404).json({ error: "Student not found" });

            const currentTime = new Date();
            
            // Find exams that match the student's semester and department and are within the valid schedule range
            const exams = await Exam.find({
                semester: student.Semester,
                departments: student.Department,
                scheduleTill: { $gte: currentTime }
            });
            console.log("Student Details:", student);
console.log("Exams Found:", exams);
console.log("User: ",req.user);

            // Fetch exams that the user has already taken
            const submittedExams = await Submission.find({ student: req.user._id }).distinct("exam");

            const submittedExamIds = submittedExams.map(sub => sub._id.toString()); // Extract exam IDs and convert them to strings

const examsWithStatus = exams.map(exam => ({
    ...exam.toObject(), 
    alreadyGiven: submittedExamIds.includes(exam._id.toString()) // Proper comparison
}));

console.log(examsWithStatus);
            // console.log(submittedExams[0]._id)


            // // Modify exam objects to include a flag
            // const examsWithStatus = exams.map(exam => ({
            //     ...exam.toObject(), 
            //     alreadyGiven: submittedExams.includes(exam._id.toString()) // Ensure type matching
            // }));

            // console.log(examsWithStatus)

            const Userprofile = await User.findById(req.user.id);
            res.render("dashboard", { 
                pic: Userprofile.imageurl, 
                logged_in: "true", 
                exams: examsWithStatus, 
                user: req.user 
            });

        } catch (error) {
            res.status(500).json({ error: "Server Error" });
        }
    } else {
        res.redirect("/");
    }
};



exports.getStartExam = async(req,res)=>{

    try {
        const examId = req.params.examId;
        const studentId = req.user._id;

        // Check if the user has already taken the exam
        const existingSubmission = await Submission.findOne({ exam: examId, student: studentId });

        if (existingSubmission) {
            return res.status(403).send("You have already taken this exam and cannot attempt it again.");
        }
        const exam = await Exam.findById(req.params.examId)
            .populate("mcqQuestions")
            .populate("codingQuestions");

        if (!exam) {
            return res.status(404).send("Exam not found");
        }

        res.render("test", { user: req.user, exam ,  });
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }


}
exports.postStartExam = async(req,res)=>{
    try {
        const { examId } = req.body;
        const student = req.user;

        const exam = await Exam.findById(examId);
        if (!exam) {
            return res.status(404).send("Exam not found");
        }

        const mcqAnswers = [];
        const codingAnswers = [];

        for (let key in req.body) {
            if (key.startsWith("mcq-")) {
                mcqAnswers.push({
                    questionId: key.replace("mcq-", ""),
                    selectedOption: req.body[key],
                });
            } else if (key.startsWith("coding-")) {
                codingAnswers.push({
                    questionId: key.replace("coding-", ""),
                    code: req.body[key],
                });
            }
        }

        const submission = new Submission({
            exam: exam._id,
            student: student._id,
            mcqAnswers,
            codingAnswers,
            submittedAt: new Date(),
        });

        await submission.save();
        
        req.flash('success', 'You have successfully completed the test!');
        
        // Redirect to dashboard
        res.redirect("/dashboard");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error submitting test");
    }
}






































// exports.postcontrol = async (req,res)=>{
//     try {
//         const student = await User.findById(req.user._id);
//         if (!student) return res.status(404).json({ error: "Student not found" });

//         const exam = await Exam.findById(req.params.examId).populate("mcqQuestions codingQuestions");

//         if (!exam) return res.status(404).json({ error: "Exam not found" });

//         // Validate if student is eligible
//         if (exam.semester !== student.Semester || !exam.departments.includes(student.Department)) {
//             return res.status(403).json({ error: "You are not eligible for this exam." });
//         }

//         res.json({ exam });
//     } catch (error) {
//         res.status(500).json({ error: "Server Error" });
//     }
// }