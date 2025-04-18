const mongoose = require('mongoose');
const addMCQ = require('../models/MCQschema');

// Connect to MongoDB 'test' database
mongoose.connect('mongodb+srv://earthlingaidtech:prep@cluster0.zsi3qjh.mongodb.net/test?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});


// Sample data
const mcqData = [
  {
    classification: 'Data Structures',
    question: 'What is the time complexity of inserting at the beginning of a linked list?',
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
    correctAnswer: 'O(1)',
    level: 'easy',
    marks: 2,
    createdBy: 'admin'
  },
  {
    classification: 'Algorithms',
    question: 'Which algorithm is used to find the shortest path in a weighted graph?',
    options: ['DFS', 'Dijkstra\'s Algorithm', 'BFS', 'Prim\'s Algorithm'],
    correctAnswer: 'Dijkstra\'s Algorithm',
    level: 'medium',
    marks: 3,
    createdBy: 'admin'
  },
  {
    classification: 'Databases',
    question: 'Which normal form removes partial dependency?',
    options: ['1NF', '2NF', '3NF', 'BCNF'],
    correctAnswer: '2NF',
    level: 'medium',
    marks: 3,
    createdBy: 'admin'
  },
  {
    classification: 'Operating Systems',
    question: 'Which of the following is a non-preemptive scheduling algorithm?',
    options: ['Round Robin', 'SJF', 'FCFS', 'Priority Scheduling'],
    correctAnswer: 'FCFS',
    level: 'easy',
    marks: 2,
    createdBy: 'admin'
  },
  {
    classification: 'Object-Oriented Programming',
    question: 'Which feature of OOP indicates code reusability?',
    options: ['Abstraction', 'Polymorphism', 'Encapsulation', 'Inheritance'],
    correctAnswer: 'Inheritance',
    level: 'easy',
    marks: 2,
    createdBy: 'admin'
  }
];

// Insert into MongoDB
addMCQ.insertMany(mcqData)
  .then(result => {
    console.log('MCQ Questions inserted successfully:', result.length);
    mongoose.connection.close();
  })
  .catch(error => {
    console.error('Error inserting MCQ Questions:', error);
    mongoose.connection.close();
  });
