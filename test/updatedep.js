// Option 1: Node.js script with MongoDB operations (Recommended)
const { MongoClient } = require('mongodb');

// MongoDB connection string - replace with your actual connection details
const connectionString = 'mongodb+srv://earthlingaidtech:prep@cluster0.zsi3qjh.mongodb.net/'; // or your cluster connection string
const dbName = 'check';

let client;
let db;

// Initialize MongoDB connection
async function initMongoDB() {
    try {
        client = new MongoClient(connectionString);
        await client.connect();
        db = client.db(dbName);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
}

// Function to execute every second
async function executeTask() {
    try {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] Executing task...`);
        
        // Your MongoDB update operation - only update records where userallowed is not true
        const result = await db.collection('user').updateMany(
            {
                userallowed: { $ne: true }  // Only target records where userallowed is not true
            },
            [
                {
                    $set: {
                        userallowed: true,
                        Semester: {
                            $cond: {
                                if: { $eq: ["$Semester", 2] },
                                then: 4,
                                else: "$Semester"  // Keep the existing Semester value if it's not 2
                            }
                        }
                    }
                }
            ]
        );
        
        console.log(`Updated ${result.modifiedCount} documents`);
        
    } catch (error) {
        console.error('Error executing task:', error);
    }
}

// Start the script
async function startScript() {
    await initMongoDB();
    
    console.log('Starting script - will execute every second');
    console.log('Press Ctrl+C to stop');
    
    // Execute immediately once
    await executeTask();
    
    // Then execute every second (1000ms)
    const interval = setInterval(executeTask, 1000);
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\nStopping script...');
        clearInterval(interval);
        await client.close();
        process.exit(0);
    });
}

// Start the script
startScript();
