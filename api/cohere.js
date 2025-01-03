// api/cohere.js V1 api NOT V2 to check if works on Vercel serverless
import cohere from 'cohere-ai';
const cohereClient = cohere.Client({
  token: process.env.COHERE_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    console.log('Cohere API request received');
    const { messages } = req.body;
    
    // Get the latest message and chat history
    const userMessage = messages[messages.length - 1].content;
    const chat_history = messages.slice(1, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'chatbot' : msg.role,
      message: msg.content
    }));

    // Log the request details
    console.log('Processing request:', {
      messageLength: userMessage?.length,
      historyLength: chat_history.length,
      model: 'command-r-plus'
    });

    if (!process.env.COHERE_API_KEY) {
      throw new Error('COHERE_API_KEY is not set');
    }

    const response = await cohereClient.chat({
      model: 'command-r-plus',
      message: userMessage,
      chat_history: chat_history,
      temperature: 0.5
    });

    console.log('Cohere Response:', {
      content: response.text.substring(0, 100) + '...',
    });

    res.status(200).json({ content: response.text });
  } catch (error) {
    console.error('Error calling Cohere API:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Error processing your request', 
      details: error.message 
    });
  }
}