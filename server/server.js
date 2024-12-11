const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const { createAgents, getAgent } = require('./agents');


require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Get MongoDB URI based on environment
const getMongoURI = () => {
  if (process.env.REACT_APP_ENV === 'development') {
    return process.env.REACT_APP_MONGODB_URI;
  }
  return process.env.MONGODB_URI;
};

mongoose.connect(getMongoURI())
  .then(() => {
    console.log('MongoDB connected successfully');
    console.log(`Running in ${process.env.REACT_APP_ENV || 'production'} mode`);
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} request to ${req.url}`);
  next();
});

// Environment-aware logging
if (process.env.REACT_APP_ENV === 'development') {
  console.log('Development environment variables:');
  console.log('REACT_APP_OPENAI_API_KEY:', process.env.REACT_APP_OPENAI_API_KEY ? 'Set' : 'Not Set');
  console.log('REACT_APP_ANTHROPIC_API_KEY:', process.env.REACT_APP_ANTHROPIC_API_KEY ? 'Set' : 'Not Set');
  console.log('REACT_APP_COHERE_API_KEY:', process.env.REACT_APP_COHERE_API_KEY ? 'Set' : 'Not Set');
  console.log('REACT_APP_MONGODB_URI:', process.env.REACT_APP_MONGODB_URI ? 'Set' : 'Not Set');
} else {
  console.log('Running in production mode');
}

// Initialize agents once
let agents;

(async () => {
  agents = await createAgents();
})();



// Route to handle Claude API requests
app.post('/api/claude', async (req, res) => {
  console.log('Received request to /api/claude');
  console.log('Request body:', req.body);
  const { message, systemPrompt, conversationHistory } = req.body;
  try {
    const agent = getAgent(agents, 'openai');
    let answer = await agent.invoke({
      messages: [
       
        {
          role: "system",
          content: "Do what the user asks. For searching canada.ca if the question is asked in english, supply 'eng' if french supply 'fra'. The search query should be a few keywords from question that is being asked. For exampple: what is SCIS, the query would be: SCIS description", //systemPrompt,
        },
        ...conversationHistory,
        {
          role: "user",
          content: message,
        },
        
      ],
    });
    if (Array.isArray(answer.messages) && answer.messages.length > 0) {
      const lastMessage = answer.messages[answer.messages.length - 1]?.content;
      res.json({ content: lastMessage });
    } else {
      res.json({ content: "No messages available" });
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to handle OpenAI API requests
app.post('/api/openai', async (req, res) => {
  console.log('Received request to /api/openai');
  console.log('Request body:', req.body);
  const { message, systemPrompt, conversationHistory } = req.body;
  try {
    const agent = getAgent(agents, 'openai');
    let answer = await agent.invoke({
      messages: [
       
        {
          role: "system",
          content: systemPrompt,
        },
        ...conversationHistory,
        {
          role: "user",
          content: message,
        },
        
      ],
    });
    if (Array.isArray(answer.messages) && answer.messages.length > 0) {
      const lastMessage = answer.messages[answer.messages.length - 1]?.content;
      res.json({ content: lastMessage });
    } else {
      res.json({ content: "No messages available" });
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Route to handle Cohere API requests
app.post('/api/cohere', async (req, res) => {
  console.log('Received request to /api/cohere');
  console.log('Request body:', req.body);
  try {
    const { message, systemPrompt, conversationHistory } = req.body;
    const agent = getAgent(agents, 'cohere');
    const prompt = `${systemPrompt}\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\nUser: ${message}`;
    const answer = await agent.call(prompt);

    res.json({ answer });
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});