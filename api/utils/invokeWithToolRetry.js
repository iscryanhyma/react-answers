import ServerLoggingService from '../../services/ServerLoggingService.js';

export async function invokeWithToolRetry(agent, messages, chatId) {
  try {
    return await agent.invoke({ messages });
  } catch (err) {
    const errMsg = err?.message || '';
    if (errMsg.includes('tool') && errMsg.includes('exist')) {
      ServerLoggingService.warn('Retry after hallucinated tool', chatId, errMsg);
      const retryMessages = [
        ...messages,
        { role: 'user', content: 'Use only the tools: downloadWebPage, checkUrl, generateContext.' }
      ];
      return await agent.invoke({ messages: retryMessages });
    }
    throw err;
  }
}

