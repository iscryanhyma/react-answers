const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { ChatOpenAI } = require('@langchain/openai');
const { ChatAnthropic } = require('@langchain/anthropic');
const { ChatCohere } = require('@langchain/cohere');
const downloadWebPageTool = require('./tools/downloadWebPage'); // Import the instantiated tool
const { getModelConfig } = require('../config/ai-models'); // Import the getModelConfig function
require('dotenv').config();

const tools = [downloadWebPageTool]; // Use the imported tool

const createOpenAIAgent = async () => {
  const modelConfig = getModelConfig('openai');
  const openai = new ChatOpenAI({
    modelName: modelConfig.name,
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
    timeoutMs: modelConfig.timeoutMs,
  });
  const agent = await createReactAgent({
    llm: openai,
    tools: tools,
  });
  return agent;
};


const createCohereAgent = async () => {
  //const modelConfig = getModelConfig('cohere');
  const cohere = new ChatCohere({
    apiKey: process.env.REACT_APP_COHERE_API_KEY,
   // model: modelConfig.name,
   // temperature: modelConfig.temperature,
   // maxTokens: modelConfig.maxTokens,
  });
  const agent = await createReactAgent({
    llm: cohere,
    tools: tools,
  });
  return agent;
};

const createClaudeAgent = async () => {
  const modelConfig = getModelConfig('anthropic');
  const claude = new ChatAnthropic({
    apiKey: process.env.REACT_APP_ANTHROPIC_API_KEY,
    modelName: modelConfig.name,
    temperature: modelConfig.temperature,
    maxTokens: modelConfig.maxTokens,
    beta: modelConfig.beta,
  });
  const agent = await createReactAgent({
    llm: claude,
    tools: tools,
  });
  return agent;
};

const createAgents = async () => {
  const openAIAgent = await createOpenAIAgent();
  const cohereAgent = await createCohereAgent();
  const claudeAgent = await createClaudeAgent();
  return { openAIAgent, cohereAgent, claudeAgent };
};

const getAgent = (agents, selectedAgent) => {
  switch (selectedAgent) {
    case 'openai':
      return agents.openAIAgent;
    case 'cohere':
      return agents.cohereAgent;
    case 'claude':
      return agents.claudeAgent;
    default:
      throw new Error('Invalid agent specified');
  }
};

module.exports = { createAgents, getAgent };