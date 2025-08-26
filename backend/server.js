// server.js (backend)
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

// Use CORS to allow requests from the React app
app.use(cors());
// Use body-parser to parse JSON bodies
app.use(bodyParser.json());

// In-memory storage for the layout
let layoutData = [];

// API endpoint to save the layout
app.post('/api/save-layout', (req, res) => {
    layoutData = req.body;
    console.log('Layout saved successfully.');
    res.json({ message: 'Layout saved successfully.' });
});

// API endpoint to get the layout
app.get('/api/get-layout', (req, res) => {
    res.json(layoutData);
});

app.listen(port, () => {
    console.log(`Backend server running at http://localhost:${port}`);
});