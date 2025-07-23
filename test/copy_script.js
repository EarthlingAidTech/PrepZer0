
// Method 1: Node.js Script - Random 50 Records with Original _id
// npm install mongodb

const { MongoClient } = require('mongodb');

async function copyRandom50Alternative() {
    const connectionString = "mongodb+srv://earthlingaidtech:prep@cluster0.zsi3qjh.mongodb.net/";
    const client = new MongoClient(connectionString);
    
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        
        const checkDb = client.db('check');
        const bmsitDb = client.db('bmsitdb');
        
        const sourceCollection = checkDb.collection('dbcodingquestions');
        const destinationCollection = bmsitDb.collection('dbcodingquestions');
        
        // Alternative approach: Get all IDs first, then randomly select
        console.log('Getting all document IDs...');
        const allIds = await sourceCollection.find({}, { projection: { _id: 1 } }).toArray();
        console.log(`Found ${allIds.length} total documents`);
        
        // Randomly shuffle and take first 50
        const shuffledIds = allIds.sort(() => 0.5 - Math.random()).slice(0, 50);
        const selectedIds = shuffledIds.map(doc => doc._id);
        
        console.log(`Randomly selected 50 IDs to copy`);
        
        // Fetch the full documents by their IDs
        const documents = await sourceCollection.find({ 
            _id: { $in: selectedIds } 
        }).toArray();
        
        console.log(`Retrieved ${documents.length} full documents`);
        
        if (documents.length > 0) {
            const result = await destinationCollection.insertMany(documents, { ordered: false });
            console.log(`Successfully copied ${result.insertedCount} random documents with original IDs`);
            console.log('Sample copied IDs:', documents.slice(0, 3).map(doc => doc._id));
        }
        
    } catch (error) {
        console.error('Error copying collection:', error);
    } finally {
        await client.close();
    }
}

copyRandom50Alternative();
