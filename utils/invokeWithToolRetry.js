import ServerLoggingService from '../services/ServerLoggingService.js';

export async function invokeWithToolRetry(agent, messages, chatId) {
  try {
    const answer = await agent.invoke({ messages });
    const last = answer?.messages?.[answer.messages.length - 1];
    const lastContent = typeof last?.content === 'string' ? last.content : '';

    if (lastContent.includes('<multi_tool_use') && lastContent.includes('tool_uses')) {
      ServerLoggingService.warn('Retry after hallucinated tool content', chatId, lastContent);
      const retryMessages = [
        ...messages,
        { role: 'user', content: 'Use only the tools: downloadWebPage, checkUrl, generateContext.' }
      ];
      return await agent.invoke({ messages: retryMessages });
    }

    return answer;
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

