const app = require('./app')
const server = require('http').createServer(app);
const port = process.env.PORT || 80


server.listen(port, function() {
    console.log(`Server started on port http://localhost:${port}`);
  });