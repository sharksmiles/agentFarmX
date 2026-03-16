/**
 * OpenAI API Mock
 * 模拟 OpenAI API 响应
 */

export const openaiMock = {
  chat: {
    completions: {
      create: jest.fn(),
    },
  },
  embeddings: {
    create: jest.fn(),
  },
};

/**
 * 创建模拟的 AI 响应
 */
export function createMockAIResponse(content: string, usage = { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 }) {
  return {
    id: 'chatcmpl-' + Date.now(),
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content,
        },
        finish_reason: 'stop',
      },
    ],
    usage,
  };
}

/**
 * 创建模拟的 Agent 决策响应
 */
export function createMockAgentDecision(action: string = 'plant', params: any = {}) {
  return createMockAIResponse(JSON.stringify({
    action,
    reasoning: 'Test reasoning for action',
    params,
    confidence: 0.85,
  }));
}

/**
 * 设置 AI 成功响应 Mock
 */
export function mockAISuccessResponse(content: string) {
  openaiMock.chat.completions.create.mockResolvedValue(createMockAIResponse(content));
}

/**
 * 设置 Agent 决策 Mock
 */
export function mockAgentDecision(action: string, params: any = {}) {
  openaiMock.chat.completions.create.mockResolvedValue(createMockAgentDecision(action, params));
}

/**
 * 设置 AI 错误响应 Mock
 */
export function mockAIError(error: Error) {
  openaiMock.chat.completions.create.mockRejectedValue(error);
}

/**
 * 重置所有 Mock
 */
export function resetOpenAIMock() {
  jest.clearAllMocks();
}

/**
 * 使用方式：
 * jest.mock('openai', () => ({
 *   OpenAI: jest.fn().mockImplementation(() => openaiMock),
 * }));
 */
