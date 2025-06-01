const mongoose = require('mongoose');
const fs = require('fs');

// Your existing MCQ schema
const mcqQuestionSchema = new mongoose.Schema({
  classification: {
    type: String,
    trim: true,
    enum: [
        'Data Structures',
        'Algorithms',
        'Databases',
        'Object-Oriented Programming',
        'Networking',
        'Operating Systems',
        'Software Engineering',
        'Mathematics',
        'Artificial Intelligence',
        'Machine Learning',
        'other'
      ]
  },
  question: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(options) {
        return options.length === 4;
      },
      message: 'Exactly 4 options are required'
    }
  },
  correctAnswer: {
    type: String,
    required: true,
    validate: {
      validator: function(answer) {
        return this.options.includes(answer);
      },
      message: 'Correct answer must be one of the provided options'
    }
  },
  level: {
    type: String,
    required: true,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  marks: {
    type: Number,
    required: true,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String
  }
});

const MCQQuestion = mongoose.model('MCQQuestion', mcqQuestionSchema, 'allmcqquestions');

// Main function to insert data
async function insertMCQQuestions() {
  try {
    // Connect to MongoDB
    // Replace 'your-connection-string' with your actual MongoDB connection string
    const connectionString = 'mongodb+srv://earthlingaidtech:prep@cluster0.zsi3qjh.mongodb.net/check?retryWrites=true&w=majority&appName=Cluster0';
    // For MongoDB Atlas: 'mongodb+srv://username:password@cluster.mongodb.net/database-name'
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB successfully!');

    // Read the JSON file with questions
    console.log('Reading questions from JSON file...');
    const questionsData = JSON.parse(fs.readFileSync('mcq_questions.json', 'utf8'));
    console.log(`📚 Found ${questionsData.length} questions to insert`);

    // Optional: Clear existing data (uncomment if you want to replace all data)
    // console.log('Clearing existing questions...');
    // await MCQQuestion.deleteMany({});
    // console.log('✅ Existing questions cleared');

    // Insert questions in batches for better performance
    const batchSize = 10;
    let insertedCount = 0;
    
    for (let i = 0; i < questionsData.length; i += batchSize) {
      const batch = questionsData.slice(i, i + batchSize);
      
      try {
        const result = await MCQQuestion.insertMany(batch, { 
          ordered: false, // Continue inserting even if some documents fail
          rawResult: true 
        });
        insertedCount += result.insertedCount;
        console.log(`✅ Inserted batch ${Math.floor(i/batchSize) + 1}: ${result.insertedCount} questions`);
      } catch (batchError) {
        console.log(`⚠️ Some questions in batch ${Math.floor(i/batchSize) + 1} failed:`, batchError.message);
        // Count successful insertions even in failed batches
        if (batchError.result && batchError.result.insertedCount) {
          insertedCount += batchError.result.insertedCount;
        }
      }
    }

    console.log('\n📊 INSERTION SUMMARY:');
    console.log(`✅ Successfully inserted: ${insertedCount} questions`);
    console.log(`❌ Failed to insert: ${questionsData.length - insertedCount} questions`);
    
    // Verify insertion
    const totalCount = await MCQQuestion.countDocuments();
    console.log(`📈 Total questions in database: ${totalCount}`);

    // Show some sample data
    console.log('\n🔍 Sample inserted question:');
    const sampleQuestion = await MCQQuestion.findOne().lean();
    console.log(JSON.stringify(sampleQuestion, null, 2));

  } catch (error) {
    console.error('❌ Error during insertion:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('📦 Database connection closed');
  }
}

// Additional utility functions

// Function to check data before insertion
async function validateQuestionsData() {
  try {
    const questionsData = JSON.parse(fs.readFileSync('mcq_questions.json', 'utf8'));
    console.log('🔍 Validating questions data...');
    
    let validCount = 0;
    const issues = [];
    
    questionsData.forEach((question, index) => {
      const questionIssues = [];
      
      if (!question.question) questionIssues.push('Missing question');
      if (!question.options || question.options.length !== 4) questionIssues.push('Invalid options');
      if (!question.correctAnswer) questionIssues.push('Missing correct answer');
      if (question.options && !question.options.includes(question.correctAnswer)) {
        questionIssues.push('Correct answer not in options');
      }
      if (!question.level || !['easy', 'medium', 'hard'].includes(question.level)) {
        questionIssues.push('Invalid level');
      }
      if (typeof question.marks !== 'number' || question.marks < 0) {
        questionIssues.push('Invalid marks');
      }
      
      if (questionIssues.length > 0) {
        issues.push(`Question ${index + 1}: ${questionIssues.join(', ')}`);
      } else {
        validCount++;
      }
    });
    
    console.log(`✅ Valid questions: ${validCount}`);
    console.log(`❌ Invalid questions: ${issues.length}`);
    
    if (issues.length > 0) {
      console.log('\nIssues found:');
      issues.slice(0, 5).forEach(issue => console.log(`- ${issue}`));
      if (issues.length > 5) {
        console.log(`... and ${issues.length - 5} more issues`);
      }
    }
    
    return issues.length === 0;
  } catch (error) {
    console.error('❌ Error validating data:', error.message);
    return false;
  }
}

// Function to backup existing data before insertion
async function backupExistingData() {
  try {
    console.log('📦 Creating backup of existing data...');
    const connectionString = 'mongodb://localhost:27017/your-database-name';
    await mongoose.connect(connectionString);
    
    const existingQuestions = await MCQQuestion.find().lean();
    const backupFileName = `mcq_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    fs.writeFileSync(backupFileName, JSON.stringify(existingQuestions, null, 2));
    console.log(`✅ Backup created: ${backupFileName} (${existingQuestions.length} questions)`);
    
    await mongoose.connection.close();
    return backupFileName;
  } catch (error) {
    console.error('❌ Error creating backup:', error.message);
    return null;
  }
}

// Command line interface
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'validate':
    validateQuestionsData();
    break;
  case 'backup':
    backupExistingData();
    break;
  case 'insert':
    insertMCQQuestions();
    break;
  default:
    console.log('🚀 MCQ Questions Insertion Script');
    console.log('\nAvailable commands:');
    console.log('  node insertMCQ.js validate  - Validate JSON data before insertion');
    console.log('  node insertMCQ.js backup   - Backup existing database data');
    console.log('  node insertMCQ.js insert   - Insert questions into database');
    console.log('\nMake sure to:');
    console.log('1. Update the MongoDB connection string in the script');
    console.log('2. Place the mcq_questions.json file in the same directory');
    console.log('3. Install dependencies: npm install mongoose');
}