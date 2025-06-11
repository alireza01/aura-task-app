import { POST } from './route'; // Assuming route.ts is in the same directory or adjust path
import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai'; // Mocked

// --- Mocks ---
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(), // Mock whatever cookies().get might be used for by createClient
    // Add other methods if your createClient uses them
  })),
}));

const mockSupabaseGetUser = jest.fn();
const mockSupabaseFrom = jest.fn();
const mockSupabaseSelect = jest.fn();
const mockSupabaseSingle = jest.fn();
const mockSupabaseEq = jest.fn();
const mockSupabaseUpdate = jest.fn(); // For admin key last_used_at

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: mockSupabaseGetUser,
    },
    from: mockSupabaseFrom,
  })),
}));

const mockStartChat = jest.fn();
const mockSendMessage = jest.fn();
const mockGenerativeModel = jest.fn(() => ({
  startChat: mockStartChat,
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: mockGenerativeModel,
  })),
  HarmCategory: { // Mock enum if used directly in route, though not in current snippet
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
  },
  HarmBlockThreshold: {
    BLOCK_NONE: 'BLOCK_NONE',
  },
}));

// Helper to create a mock NextRequest
const mockRequest = (body: any) => {
  return {
    json: async () => body,
    // Add other NextRequest properties if needed
  } as unknown as NextRequest;
};

// Helper for AI response
const mockAiResponse = (text: string) => ({
  response: {
    text: () => text,
  },
});

const successfulAiResultJson = JSON.stringify({
  speedScore: 15,
  importanceScore: 18,
  emoji: '🚀',
  subtasks: ['Do this', 'Do that'],
});


describe('POST /api/process-task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default Supabase client behavior
    mockSupabaseFrom.mockImplementation(() => ({
      select: mockSupabaseSelect,
      update: mockSupabaseUpdate, // for admin_api_keys.last_used_at
    }));
    mockSupabaseSelect.mockImplementation(() => ({
      eq: mockSupabaseEq,
    }));
    mockSupabaseEq.mockImplementation(() => ({
      single: mockSupabaseSingle,
      then: (callback: (data: { data: any[]; error: null }) => any) => Promise.resolve(callback({ data: [], error: null })),
    }));
    mockSupabaseSingle.mockResolvedValue({ data: null, error: null });
    mockSupabaseUpdate.mockResolvedValue({ error: null }); // Default for admin key update

    // Default AI behavior
    mockStartChat.mockReturnValue({ sendMessage: mockSendMessage });
    mockSendMessage.mockResolvedValue(mockAiResponse(successfulAiResultJson));
  });

  // --- Test Cases ---

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Unauthorized' } });
    const request = mockRequest({ title: 'Test Task' });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('should process with user API key if available and valid', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabaseEq.mockImplementationOnce((column: string, value: string) => {
      if (column === 'user_id' && value === 'user-123') {
        return { single: () => Promise.resolve({ data: { gemini_api_key: 'user_valid_key' }, error: null }) };
      }
      return { single: () => Promise.resolve({ data: null, error: null }) };
    });

    const request = mockRequest({ title: 'Test Task', autoRanking: true });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(GoogleGenerativeAI).toHaveBeenCalledWith('user_valid_key');
    expect(json.emoji).toBe('🚀');
    expect(mockSupabaseUpdate).not.toHaveBeenCalled(); // Admin key not used
  });

  it('should fallback to admin key if user key is missing', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabaseEq.mockImplementation((column: string) => {
      if (column === 'user_id') {
        return { single: () => Promise.resolve({ data: { gemini_api_key: null }, error: null }) };
      }
      if (column === 'is_active') {
        return Promise.resolve({ data: [{ id: 'admin-key-1', api_key: 'admin_valid_key' }], error: null });
      }
      return { single: () => Promise.resolve({ data: null, error: null }) };
    });

    const request = mockRequest({ title: 'Test Task', autoRanking: true });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(GoogleGenerativeAI).toHaveBeenCalledWith('admin_valid_key');
    expect(json.emoji).toBe('🚀');
    expect(mockSupabaseUpdate).toHaveBeenCalledWith({ last_used_at: expect.any(String) });
    expect(mockSupabaseEq).toHaveBeenCalledWith('id', 'admin-key-1');
  });

  it('should fallback to admin key if user key fails with auth error', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabaseEq.mockImplementation((column: string) => {
      if (column === 'user_id') {
        return { single: () => Promise.resolve({ data: { gemini_api_key: 'user_invalid_key' }, error: null }) };
      }
      if (column === 'is_active') {
        return Promise.resolve({ data: [{ id: 'admin-key-1', api_key: 'admin_valid_key' }], error: null });
      }
      return { single: () => Promise.resolve({ data: null, error: null }) };
    });

    // Mock AI to throw auth error for user key, then succeed for admin key
    (GoogleGenerativeAI as jest.Mock)
      .mockImplementationOnce((key: string) => { // For user_invalid_key
        if (key === 'user_invalid_key') {
          return { getGenerativeModel: () => ({ startChat: () => ({ sendMessage: () => Promise.reject(new Error('API key not valid.')) }) }) };
        }
        throw new Error("Unexpected key in mock for user_invalid_key scenario");
      })
      .mockImplementationOnce((key: string) => { // For admin_valid_key
         if (key === 'admin_valid_key') {
           return { getGenerativeModel: () => ({ startChat: () => ({ sendMessage: () => Promise.resolve(mockAiResponse(successfulAiResultJson)) }) }) };
         }
         throw new Error("Unexpected key in mock for admin_valid_key scenario");
      });

    const request = mockRequest({ title: 'Test Task', autoSubtasks: true });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.emoji).toBe('🚀');
    expect(GoogleGenerativeAI).toHaveBeenCalledWith('user_invalid_key');
    expect(GoogleGenerativeAI).toHaveBeenCalledWith('admin_valid_key');
    expect(mockSupabaseUpdate).toHaveBeenCalled();
  });

  it('should NOT fallback to admin key if user key fails with non-auth error (e.g., safety)', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabaseEq.mockImplementationOnce((column: string, value: string) => { // For user_settings
      if (column === 'user_id' && value === 'user-123') {
        return { single: () => Promise.resolve({ data: { gemini_api_key: 'user_valid_key_safety_issue' }, error: null }) };
      }
      return { single: () => Promise.resolve({ data: null, error: null }) };
    });

    (GoogleGenerativeAI as jest.Mock).mockImplementationOnce((key: string) => {
      if (key === 'user_valid_key_safety_issue') {
        return { getGenerativeModel: () => ({ startChat: () => ({ sendMessage: () => Promise.reject(new Error('SAFETY block.')) }) }) };
      }
      throw new Error("Should not be called with other keys");
    });

    const request = mockRequest({ title: 'Test Task', autoRanking: true });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400); // Or 500 depending on how it's handled, currently 400 for SAFETY
    expect(json.error).toContain('Content blocked due to safety settings');
    expect(GoogleGenerativeAI).toHaveBeenCalledTimes(1); // Only user key attempted
    expect(mockSupabaseUpdate).not.toHaveBeenCalled(); // No admin key used
  });

  it('should return 503 if no API keys are available and AI features are requested', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabaseEq.mockImplementation((column: string) => {
      if (column === 'user_id') { // user_settings
        return { single: () => Promise.resolve({ data: { gemini_api_key: null }, error: null }) };
      }
      if (column === 'is_active') { // admin_api_keys
        return Promise.resolve({ data: [], error: null }); // No active admin keys
      }
      return { single: () => Promise.resolve({ data: null, error: null }) };
    });

    const request = mockRequest({ title: 'Test Task', autoRanking: true });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(503);
    expect(json.error).toContain('No working API key found or all attempts failed');
  });

  it('should return default result if AI features are disabled', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
    // User settings might have weights but no API key
    mockSupabaseEq.mockImplementationOnce((column: string, value: string) => {
      if (column === 'user_id' && value === 'user-123') {
        return { single: () => Promise.resolve({ data: { gemini_api_key: null, speed_weight: 60, importance_weight: 40 }, error: null }) };
      }
      return { single: () => Promise.resolve({ data: null, error: null }) };
    });

    const request = mockRequest({ title: 'Test Task', autoRanking: false, autoSubtasks: false });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.speedScore).toBe(12); // 60/5
    expect(json.importanceScore).toBe(8); // 40/5
    expect(json.emoji).toBe('📝');
    expect(json.subtasks).toEqual([]);
    expect(GoogleGenerativeAI).not.toHaveBeenCalled();
  });

});
