// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'DELETE'], // Allow these methods
  }));
const PORT = 3000;
const DB_URL = "mongodb+srv://earthlingaidtech:prep@cluster0.zsi3qjh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB using Mongoose
mongoose.connect(DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connected via Mongoose"))
.catch((err) => console.error("Connection error:", err));

// Delete route
app.delete('/delete-collections', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    console.log(db)
    // Drop collections if they exist
    const collections = await db.listCollections().toArray();
    console.log(collections)
    const collectionNames = collections.map(c => c.name);
    console.log(collectionNames)
    if (collectionNames.includes("integrities")) {
        console.log("hasbdjashdsahjdbsajdbsagjkdhsvab")
      await db.dropCollection("integrities");
    }

    if (collectionNames.includes("submissions")) {
      await db.dropCollection("submissions");
    }

    res.status(200).send("Collections deleted successfully");
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Failed to delete collections: " + error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
