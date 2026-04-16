import type { ChatRequest, ChatResponse, Message } from './types';

export async function chatWithGemini15(request: ChatRequest): Promise<ChatResponse> {
  try {
    const { messages, apiKey, temperature = 0.7, maxTokens = 2048 } = request;

    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    // Extract system message
    const systemMessage = messages.find(m => m.role === 'system');
    
    // Get conversation messages (non-system)
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Convert to Gemini format with proper role alternation
    const geminiMessages: Array<{role: string, parts: Array<{text: string}>}> = [];
    
    for (const msg of conversationMessages) {
      const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
      
      let content = msg.content;
      
      // Prepend system message to first user message
      if (systemMessage && geminiMessages.length === 0 && geminiRole === 'user') {
        content = `${systemMessage.content}\n\n${content}`;
      }
      
      geminiMessages.push({
        role: geminiRole,
        parts: [{ text: content }]
      });
    }

    // Ensure we have messages
    if (geminiMessages.length === 0) {
      throw new Error('No messages to send');
    }

    // Ensure last message is from user
    if (geminiMessages[geminiMessages.length - 1].role !== 'user') {
      throw new Error('Last message must be from user');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            topP: 0.95,
            topK: 40,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini 1.5 API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    // Check for blocked content
    if (data.promptFeedback?.blockReason) {
      throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
    }

    // Extract response
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('Empty response from Gemini');
    }

    return {
      content,
      model: 'gemini-1.5-flash',
      timestamp: new Date().toISOString(),
      tokensUsed: data.usageMetadata?.totalTokenCount,
    };
  } catch (error: any) {
    console.error('Gemini 1.5 chat error:', error);
    throw new Error(`Gemini 1.5: ${error.message}`);
  }
}

export async function chatWithGeminiPro(request: ChatRequest): Promise<ChatResponse> {
  try {
    const { messages, apiKey, temperature = 0.7, maxTokens = 2048 } = request;

    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    // Extract system message
    const systemMessage = messages.find(m => m.role === 'system');
    
    // Get conversation messages (non-system)
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Convert to Gemini format
    const geminiMessages: Array<{role: string, parts: Array<{text: string}>}> = [];
    
    for (const msg of conversationMessages) {
      const geminiRole = msg.role === 'assistant' ? 'model' : 'user';
      
      let content = msg.content;
      
      // Prepend system message to first user message
      if (systemMessage && geminiMessages.length === 0 && geminiRole === 'user') {
        content = `${systemMessage.content}\n\n${content}`;
      }
      
      geminiMessages.push({
        role: geminiRole,
        parts: [{ text: content }]
      });
    }

    if (geminiMessages.length === 0) {
      throw new Error('No messages to send');
    }

    if (geminiMessages[geminiMessages.length - 1].role !== 'user') {
      throw new Error('Last message must be from user');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            topP: 0.95,
            topK: 40,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini Pro API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    if (data.promptFeedback?.blockReason) {
      throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
    }

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('Empty response from Gemini');
    }

    return {
      content,
      model: 'gemini-pro',
      timestamp: new Date().toISOString(),
      tokensUsed: data.usageMetadata?.totalTokenCount,
    };
  } catch (error: any) {
    console.error('Gemini Pro chat error:', error);
    throw new Error(`Gemini Pro: ${error.message}`);
  }
}

