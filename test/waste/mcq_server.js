const express = require('express');
const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const MCQQuestion = require('../models/MCQschema'); // Adjust path if needed

const app = express();
const PORT = 3000;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');

// Connect to MongoDB
mongoose.connect('mongodb+srv://earthlingaidtech:prep@cluster0.zsi3qjh.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Multer setup
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, 'mcq-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function(req, file, cb) {
    if (path.extname(file.originalname) !== '.csv') {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

app.get('/', (req, res) => {
    res.render("csv");
  });

// Route for uploading CSV
app.post('/upload-mcq-csv', upload.single('csvFile'), async (req, res) => {
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
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});





