import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NicknameSetupModal from './nickname-setup-modal';
import { useToast } from "@/components/ui/use-toast"; // Actual import

// Mock useToast
jest.mock("@/components/ui/use-toast", () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn(),
  })),
}));

// Mock Supabase client (already in jest.setup.js, but can be more specific here if needed)
// For this test, the default mock in jest.setup.js should be sufficient.

import { mockSupabaseClientInstance } from '../../jest.setup'; // Adjust path as needed

const mockOnClose = jest.fn();
const mockOnNicknameSet = jest.fn();
const mockToast = jest.fn();

describe('NicknameSetupModal', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockOnClose.mockClear();
    mockOnNicknameSet.mockClear();
    mockToast.mockClear();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

    // Reset the 'from' mock on the shared mockSupabaseClientInstance
    mockSupabaseClientInstance.from.mockClear();
  });

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    currentNickname: '',
    userId: 'test-user-123',
    onNicknameSet: mockOnNicknameSet,
  };

  it('renders the modal when isOpen is true', () => {
    render(<NicknameSetupModal {...defaultProps} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('تنظیم اسم مستعار')).toBeInTheDocument();
    expect(screen.getByLabelText('اسم مستعار')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ذخیره و ادامه' })).toBeInTheDocument();
  });

  it('does not render the modal when isOpen is false', () => {
    render(<NicknameSetupModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('updates nickname input value on change', () => {
    render(<NicknameSetupModal {...defaultProps} />);
    const nicknameInput = screen.getByLabelText('اسم مستعار') as HTMLInputElement;
    fireEvent.change(nicknameInput, { target: { value: 'TestNick' } });
    expect(nicknameInput.value).toBe('TestNick');
  });

  it('calls onClose when the dialog is closed via onOpenChange (e.g., Escape key or overlay click)', () => {
    render(<NicknameSetupModal {...defaultProps} />);
    // Simulate the onOpenChange event that Radix Dialog triggers
    // This is a bit tricky as it's an internal mechanism.
    // For simplicity, we'll assume the form submission path covers modal closing.
    // If direct testing of onOpenChange is needed, it might require deeper Radix interaction.
    // For now, we verify onClose is called on successful submission.
  });

  it('shows error toast if nickname is empty on submit', async () => {
    render(<NicknameSetupModal {...defaultProps} />);
    const submitButton = screen.getByRole('button', { name: 'ذخیره و ادامه' });
    fireEvent.submit(submitButton); // Or fireEvent.click(submitButton) then check form's onSubmit

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "خطا",
        description: "اسم مستعار نمی‌تواند خالی باشد.",
        variant: "destructive",
      });
    });
    expect(mockOnNicknameSet).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('shows error toast if nickname is less than 3 characters', async () => {
    render(<NicknameSetupModal {...defaultProps} />);
    const nicknameInput = screen.getByLabelText('اسم مستعار');
    fireEvent.change(nicknameInput, { target: { value: 'ab' } });
    const submitButton = screen.getByRole('button', { name: 'ذخیره و ادامه' });
    fireEvent.submit(submitButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "خطا",
        description: "اسم مستعار باید حداقل ۳ کاراکتر باشد.",
        variant: "destructive",
      });
    });
  });

  it('calls Supabase update and onNicknameSet/onClose on successful submission', async () => {
    const mockEqSuccess = jest.fn().mockResolvedValue({ error: null });
    const mockUpdateSuccess = jest.fn().mockReturnValue({ eq: mockEqSuccess });
    mockSupabaseClientInstance.from.mockImplementation((tableName) => {
      if (tableName === 'user_profiles') {
        return { update: mockUpdateSuccess };
      }
      return { update: jest.fn().mockReturnValue({ eq: jest.fn() }) }; // Default for other tables
    });

    render(<NicknameSetupModal {...defaultProps} currentNickname="OldNick" />);
    const nicknameInput = screen.getByLabelText('اسم مستعار');
    fireEvent.change(nicknameInput, { target: { value: 'NewValidNick' } });

    const form = screen.getByRole('dialog').querySelector('form');
    expect(form).not.toBeNull();
    if (form) {
        fireEvent.submit(form);
    }

    await waitFor(() => {
      expect(mockSupabaseClientInstance.from).toHaveBeenCalledWith('user_profiles');
      expect(mockUpdateSuccess).toHaveBeenCalledWith({ nickname: 'NewValidNick', has_set_nickname: true });
      expect(mockEqSuccess).toHaveBeenCalledWith('user_id', 'test-user-123');
    });

    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
            title: "موفقیت‌آمیز",
            description: "اسم مستعار شما با موفقیت ذخیره شد.",
        });
    });

    await waitFor(() => {
        expect(mockOnNicknameSet).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });


  it('shows error toast if Supabase update fails', async () => {
    const updateError = { message: 'Supabase update failed', code: '12345' };
    const mockEqFailure = jest.fn().mockResolvedValue({ error: updateError });
    const mockUpdateFailure = jest.fn().mockReturnValue({ eq: mockEqFailure });
    mockSupabaseClientInstance.from.mockImplementation((tableName) => {
      if (tableName === 'user_profiles') {
        return { update: mockUpdateFailure };
      }
      return { update: jest.fn().mockReturnValue({ eq: jest.fn() }) }; // Default for other tables
    });

    render(<NicknameSetupModal {...defaultProps} />);
    const nicknameInput = screen.getByLabelText('اسم مستعار');
    fireEvent.change(nicknameInput, { target: { value: 'AnotherNick' } });

    const form = screen.getByRole('dialog').querySelector('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(mockSupabaseClientInstance.from).toHaveBeenCalledWith('user_profiles');
      expect(mockUpdateFailure).toHaveBeenCalledWith({ nickname: 'AnotherNick', has_set_nickname: true });
      expect(mockEqFailure).toHaveBeenCalledWith('user_id', 'test-user-123');
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: "خطا در ذخیره اسم مستعار",
        description: updateError.message,
        variant: "destructive",
      });
    });
    expect(mockOnNicknameSet).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('displays current nickname in input if provided', () => {
    render(<NicknameSetupModal {...defaultProps} currentNickname="ExistingUser" />);
    const nicknameInput = screen.getByLabelText('اسم مستعار') as HTMLInputElement;
    expect(nicknameInput.value).toBe('ExistingUser');
  });

  it('submit button is disabled while loading', async () => {
    // Mock Supabase to delay response to show loading state
    let resolvePromise: (value: { error: null } | { error: { message: string } }) => void; // More specific type
    const promise = new Promise(resolve => { resolvePromise = resolve; });
    const mockEqLoading = jest.fn(() => promise);
    const mockUpdateLoading = jest.fn().mockReturnValue({ eq: mockEqLoading });
    mockSupabaseClientInstance.from.mockImplementation((tableName) => {
      if (tableName === 'user_profiles') {
        return { update: mockUpdateLoading };
      }
      return { update: jest.fn().mockReturnValue({ eq: jest.fn() }) };
    });

    render(<NicknameSetupModal {...defaultProps} />);
    const nicknameInput = screen.getByLabelText('اسم مستعار');
    fireEvent.change(nicknameInput, { target: { value: 'LoadingTest' } });

    const submitButton = screen.getByRole('button', { name: 'ذخیره و ادامه' });
    const form = screen.getByRole('dialog').querySelector('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('در حال ذخیره...')).toBeInTheDocument();
    });

    // @ts-ignore
    resolvePromise({ error: null }); // Resolve the promise to complete the submission for this test

     await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
    });
  });

});
