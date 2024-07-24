const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(bodyParser.json());

const SECRET_KEY = process.env.SECRET_KEY;
const SUBMIT_JOKES_SERVICE_URL = process.env.SUBMIT_JOKES_SERVICE_URL;
const DELIVER_JOKES_SERVICE_URL = process.env.DELIVER_JOKES_SERVICE_URL;
const MODERATOR_CREDENTIALS = { email: 'admin@admin.com', password: 'admin123' };

// Middleware for authentication
function authenticate(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).send('Access denied. No token provided.');

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).send('Invalid token.');
  }
}

// Login route
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === MODERATOR_CREDENTIALS.email && password === MODERATOR_CREDENTIALS.password) {
    const token = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1h' });
    res.send({ token });
  } else {
    res.status(400).send('Invalid credentials.');
  }
});

// Route to get a joke for moderation
app.get('/joke', authenticate, async (req, res) => {
  try {
    const response = await axios.get(`${SUBMIT_JOKES_SERVICE_URL}/jokes/pending`);
    const jokes = response.data;
    if (jokes.length > 0) {
      res.send(jokes[0]);
    } else {
      res.send({ message: 'No jokes available for moderation.' });
    }
  } catch (error) {
    res.status(500).send('Error fetching jokes.');
  }
});

// Route to edit a joke
app.put('/joke/:id', authenticate, async (req, res) => {
  const jokeId = req.params.id;
  const { content, type } = req.body;
  try {
    const response = await axios.put(`${SUBMIT_JOKES_SERVICE_URL}/jokes/${jokeId}`, { content, type });
    res.send(response.data);
  } catch (error) {
    res.status(500).send('Error editing joke.');
  }
});

// Route to approve or reject a joke
app.post('/joke/:id/approve', authenticate, async (req, res) => {
  const jokeId = req.params.id;
  const { approve } = req.body;

  try {
    const response = await axios.get(`${SUBMIT_JOKES_SERVICE_URL}/jokes/${jokeId}`);
    const joke = response.data;

    if (approve) {
      await axios.post(`${DELIVER_JOKES_SERVICE_URL}/jokes`, joke);
    }

    await axios.delete(`${SUBMIT_JOKES_SERVICE_URL}/jokes/${jokeId}`);
    res.send({ success: true });
  } catch (error) {
    res.status(500).send('Error approving/rejecting joke.');
  }
});

app.listen(PORT, () => console.log(`Moderate Jokes service running on port ${PORT}`));
