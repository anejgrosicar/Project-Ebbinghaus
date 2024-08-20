const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your_jwt_secret'; // Change this to a secure random string

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Read users from JSON file
let users = [];
try {
    const data = fs.readFileSync('users.json', 'utf8');
    users = JSON.parse(data);
} catch (err) {
    console.error(err);
}

// Registration endpoint
app.post('/register', async (req, res) => {
  console.log('Received registration request:', req.body);
  try {
      const { fullname, email, phone, password } = req.body;
      if (users.find(user => user.email === email)) {
          console.log('Email already exists:', email);
          return res.status(400).json({ error: 'Email already exists' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { fullname, email, phone, password: hashedPassword, decks: [] };
      users.push(newUser);
      fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
      console.log('User registered successfully:', email);
      res.json({ message: 'User registered successfully' });
  } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ error: 'An error occurred during registration' });
  }
});

// Login endpoint
app.post('/login', async (req, res) => {
  console.log('Received login request:', req.body);
  try {
      const { email, password } = req.body;
      const user = users.find(user => user.email === email);
      if (user) {
          let isValid;
          if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
              // Hashed password
              isValid = await bcrypt.compare(password, user.password);
          } else {
              // Unhashed password (temporary)
              isValid = password === user.password;
              if (isValid) {
                  // Update to hashed password
                  user.password = await bcrypt.hash(password, 10);
                  fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
              }
          }
          if (isValid) {
              const token = jwt.sign({ userId: user.email }, JWT_SECRET, { expiresIn: '1h' });
              console.log('Login successful:', email);
              res.json({ message: 'Login successful', token, username: user.fullname });
          } else {
              console.log('Invalid credentials:', email);
              res.status(401).json({ error: 'Invalid credentials' });
          }
      } else {
          console.log('User not found:', email);
          res.status(401).json({ error: 'Invalid credentials' });
      }
  } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Middleware to check authentication
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Protected route example
app.get('/user-decks', authenticateToken, (req, res) => {
    const user = users.find(u => u.email === req.user.userId);
    if (user) {
        res.json(user.decks);
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Route definitions
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home-page.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Start the server
app.listen(PORT, () => console.log(Server running on port ${PORT}));

// Add this to your existing user model
const userSchema = {
  // ... existing fields
  recentActivity: [],
  decks: [{ 
    name: String, 
    cards: [], 
    nextReview: Date 
  }]
};

// Function to add activity
function addActivity(userId, activity) {
  const user = users.find(u => u.email === userId);
  if (user) {
    user.recentActivity.unshift(activity);
    user.recentActivity = user.recentActivity.slice(0, 5); // Keep only last 5 activities
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
  }
}

// New endpoint to get user data
app.get('/user-data', authenticateToken, (req, res) => {
  const user = users.find(u => u.email === req.user.userId);
  if (user) {
    const userData = {
      recentActivity: user.recentActivity,
      upcomingReviews: user.decks
        .filter(deck => deck.nextReview > new Date())
        .sort((a, b) => a.nextReview - b.nextReview)
        .slice(0, 5)
        .map(deck => ({ name: deck.name, date: deck.nextReview }))
    };
    res.json(userData);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Use addActivity in relevant places, e.g.:
app.post('/add-deck', authenticateToken, (req, res) => {
  // ... deck adding logic
  addActivity(req.user.userId, Added new deck: ${req.body.deckName});
});"
>package.json:"{
  "name": "memory-website",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "start": "node server.js"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "description": "",
  "dependencies": {
    "bcrypt": "^5.0.1",
    "body-parser": "^1.20.2",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2"
  }
}