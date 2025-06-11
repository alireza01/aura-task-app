import { POST } from './route';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers'; // Mocked
import { createClient } from '@/lib/supabase/server'; // Mocked
import { GoogleGenerativeAI } from '@google/generative-ai'; // Mocked

// --- Mocks ---
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
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

const mockGenerateContent = jest.fn();
const mockGenerativeModel = jest.fn(() => ({
  generateContent: mockGenerateContent,
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: mockGenerativeModel,
  })),
}));

// Helper to create a mock NextRequest
const mockRequest = (body: any) => {
  return {
    json: async () => body,
  } as unknown as NextRequest;
};

// Helper for AI response
const mockAiEmojiResponse = (emoji: string) => ({
  response: {
    text: () => emoji,
  },
});

describe('POST /api/assign-group-emoji', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default Supabase client behavior
    mockSupabaseFrom.mockImplementation(() => ({
      select: mockSupabaseSelect,
      update: mockSupabaseUpdate,
    }));
    mockSupabaseSelect.mockImplementation(() => ({
      eq: mockSupabaseEq,
    }));
    mockSupabaseEq.mockImplementation(() => ({
      single: mockSupabaseSingle,
       // also handles non-single results like for admin_api_keys
      then: (callback) => Promise.resolve(callback({ data: [], error: null })),
    }));
    mockSupabaseSingle.mockResolvedValue({ data: null, error: null });
    mockSupabaseUpdate.mockResolvedValue({ error: null });

    // Default AI behavior
    mockGenerateContent.mockResolvedValue(mockAiEmojiResponse('🚀'));
  });

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: null }, error: { message: 'Unauthorized' } });
    const request = mockRequest({ groupName: 'Test Group' });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.error).toBe('Unauthorized');
  });

  it('should assign emoji using user API key if available', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabaseEq.mockImplementationOnce((column, value) => { // For user_settings
      if (column === 'user_id' && value === 'user-123') {
        return { single: () => Promise.resolve({ data: { gemini_api_key: 'user_valid_key' }, error: null }) };
      }
      return { single: () => Promise.resolve({ data: null, error: null }) };
    });

    const request = mockRequest({ groupName: 'Test Group' });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(GoogleGenerativeAI).toHaveBeenCalledWith('user_valid_key');
    expect(json.emoji).toBe('🚀');
    expect(mockSupabaseUpdate).not.toHaveBeenCalled(); // Admin key not used
  });

  it('should fallback to admin key if user key is missing', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabaseEq.mockImplementation((column, value) => {
      if (column === 'user_id') { // user_settings
        return { single: () => Promise.resolve({ data: { gemini_api_key: null }, error: null }) };
      }
      if (column === 'is_active') { // admin_api_keys
        return Promise.resolve({ data: [{ id: 'admin-key-1', api_key: 'admin_valid_key' }], error: null });
      }
      return { single: () => Promise.resolve({ data: null, error: null }) };
    });

    const request = mockRequest({ groupName: 'Test Group' });
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
    mockSupabaseEq.mockImplementation((column, value) => {
      if (column === 'user_id') {
         return { single: () => Promise.resolve({ data: { gemini_api_key: 'user_invalid_key' }, error: null }) };
      }
      if (column === 'is_active') {
        return Promise.resolve({ data: [{ id: 'admin-key-1', api_key: 'admin_valid_key' }], error: null });
      }
      return { single: () => Promise.resolve({ data: null, error: null }) };
    });

    (GoogleGenerativeAI as jest.Mock)
      .mockImplementationOnce((key: string) => {
        if (key === 'user_invalid_key') {
          return { getGenerativeModel: () => ({ generateContent: () => Promise.reject(new Error('API key not valid.')) }) };
        }
        throw new Error("Unexpected key for user_invalid_key");
      })
      .mockImplementationOnce((key: string) => {
         if (key === 'admin_valid_key') {
           return { getGenerativeModel: () => ({ generateContent: () => Promise.resolve(mockAiEmojiResponse('😃')) }) };
         }
         throw new Error("Unexpected key for admin_valid_key");
      });

    const request = mockRequest({ groupName: 'Test Group' });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.emoji).toBe('😃');
    expect(GoogleGenerativeAI).toHaveBeenCalledWith('user_invalid_key');
    expect(GoogleGenerativeAI).toHaveBeenCalledWith('admin_valid_key');
    expect(mockSupabaseUpdate).toHaveBeenCalled();
  });

  it('should use fallback emoji if user key fails with non-auth error (no admin fallback for this type of error in emoji assign)', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabaseEq.mockImplementationOnce((column, value) => {
      if (column === 'user_id' && value === 'user-123') {
        return { single: () => Promise.resolve({ data: { gemini_api_key: 'user_valid_key_safety_issue' }, error: null }) };
      }
      return { single: () => Promise.resolve({ data: null, error: null }) };
    });

    (GoogleGenerativeAI as jest.Mock).mockImplementationOnce((key: string) => {
      if (key === 'user_valid_key_safety_issue') {
        return { getGenerativeModel: () => ({ generateContent: () => Promise.reject(new Error('SAFETY block.')) }) };
      }
      throw new Error("Should not be called with other keys");
    });

    const request = mockRequest({ groupName: 'Test Group' });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200); // Fallback emoji is a success from API perspective
    expect(json.emoji).toBe('📁');
    expect(GoogleGenerativeAI).toHaveBeenCalledTimes(1);
    expect(mockSupabaseUpdate).not.toHaveBeenCalled();
  });


  it('should return fallback emoji if no API keys are available', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabaseEq.mockImplementation((column, value) => {
      if (column === 'user_id') {
        return { single: () => Promise.resolve({ data: { gemini_api_key: null }, error: null }) };
      }
      if (column === 'is_active') {
        return Promise.resolve({ data: [], error: null }); // No active admin keys
      }
      return { single: () => Promise.resolve({ data: null, error: null }) };
    });

    const request = mockRequest({ groupName: 'Test Group' });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.emoji).toBe('📁');
  });

  it('should return 400 if groupName is missing', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
    const request = mockRequest({ }); // Missing groupName
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe('Invalid input.');
  });

  it('should correctly parse a valid emoji from AI', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabaseEq.mockImplementationOnce((column, value) => {
      if (column === 'user_id' && value === 'user-123') {
        return { single: () => Promise.resolve({ data: { gemini_api_key: 'user_valid_key' }, error: null }) };
      }
      return { single: () => Promise.resolve({ data: null, error: null }) };
    });
    mockGenerateContent.mockResolvedValueOnce(mockAiEmojiResponse('🎉'));

    const request = mockRequest({ groupName: 'Celebration' });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.emoji).toBe('🎉');
  });

  it('should use fallback emoji if AI returns invalid/non-emoji string', async () => {
    mockSupabaseGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-123' } }, error: null });
    mockSupabaseEq.mockImplementationOnce((column, value) => {
      if (column === 'user_id' && value === 'user-123') {
        return { single: () => Promise.resolve({ data: { gemini_api_key: 'user_valid_key' }, error: null }) };
      }
      return { single: () => Promise.resolve({ data: null, error: null }) };
    });
    mockGenerateContent.mockResolvedValueOnce(mockAiEmojiResponse('Not an emoji'));

    const request = mockRequest({ groupName: 'Test' });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.emoji).toBe('📁');
  });

});
