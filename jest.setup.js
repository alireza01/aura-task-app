// jest.setup.js
import '@testing-library/jest-dom';

// You can add any global setup options here.
// For example, mocking global objects or functions:
/*
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));
*/

// Mock Supabase client
const mockSupabaseClientAuth = {
  getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
};

const mockSupabaseClientFrom = jest.fn(() => ({ // Default 'from' implementation
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: {}, error: null }),
}));

const mockSupabaseClientInstance = {
  auth: mockSupabaseClientAuth,
  from: mockSupabaseClientFrom,
  // Add other Supabase client methods you might need to mock at this level
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClientInstance),
}));


// Mock the cn utility function from @/lib/utils
jest.mock('@/lib/utils', () => ({
  ...jest.requireActual('@/lib/utils'), // Import and retain other exports from the original module
  cn: (...inputs) => {
    // A simple implementation for testing purposes
    return inputs.filter(Boolean).join(' ');
  },
}));

// Mock Redux store if your component is connected
/*
jest.mock('@/lib/store', () => ({
  useAppDispatch: jest.fn(() => jest.fn()),
  useAppSelector: jest.fn((selector) => selector({
    // Provide mock state for your selectors here
    auth: { user: { id: 'test-user-id', user_metadata: { nickname: 'TestUser' } }, loading: false, error: null },
    // ... other slices
  })),
}));
*/

// Export the mock client so it can be manipulated in tests
export { mockSupabaseClientInstance, mockSupabaseClientFrom, mockSupabaseClientAuth }; // Export specific parts if needed for direct manipulation

// Mock next/font - if you are using next/font
jest.mock('next/font/google', () => ({
  Vazirmatn: jest.fn(() => ({
    className: 'mock-font-class', // Provide a mock class name
  })),
  // Add other fonts you use
}));


// Clean up after each test
import { cleanup } from '@testing-library/react';
afterEach(() => {
  cleanup();
});
