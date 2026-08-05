import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import { SystemPromptToggle } from '../SystemPromptToggle';

// Mock the API hooks and the toast store
const mockUseSystemPrompt = vi.fn();
const mockUseUpdateSystemPrompt = vi.fn();
const mockShowToast = vi.fn();

vi.mock('../../../api/useSystemPromptApi', () => ({
  useSystemPrompt: () => mockUseSystemPrompt(),
  useUpdateSystemPrompt: () => mockUseUpdateSystemPrompt()
}));

vi.mock('../../../store/useToastStore', () => ({
  useToastStore: () => ({ showToast: mockShowToast })
}));

describe('SystemPromptToggle', () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSystemPrompt.mockReturnValue({
      data: { system_prompt: 'Be terse.', enabled: true },
      isLoading: false,
      isError: false
    });

    mockUseUpdateSystemPrompt.mockReturnValue({
      mutate: mockMutate,
      isPending: false
    });
  });

  describe('Status Display', () => {
    it('shows "On" when the system prompt is enabled', () => {
      render(<SystemPromptToggle />);

      expect(screen.getByText(/System prompt: On/)).toBeInTheDocument();
    });

    it('shows "Off" when the system prompt is disabled', () => {
      mockUseSystemPrompt.mockReturnValue({
        data: { system_prompt: 'Be terse.', enabled: false },
        isLoading: false,
        isError: false
      });

      render(<SystemPromptToggle />);

      expect(screen.getByText(/System prompt: Off/)).toBeInTheDocument();
    });

    it('shows "None set" when no system prompt is configured', () => {
      mockUseSystemPrompt.mockReturnValue({
        data: { system_prompt: '', enabled: true },
        isLoading: false,
        isError: false
      });

      render(<SystemPromptToggle />);

      expect(screen.getByText(/System prompt: None set/)).toBeInTheDocument();
    });

    it('shows a loading state while fetching', () => {
      mockUseSystemPrompt.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false
      });

      render(<SystemPromptToggle />);

      expect(screen.getByText(/System prompt: Loading/)).toBeInTheDocument();
    });

    it('renders nothing when the endpoint is unavailable', () => {
      mockUseSystemPrompt.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true
      });

      const { container } = render(<SystemPromptToggle />);

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Toggle Behavior', () => {
    it('disables the system prompt when switched off', () => {
      render(<SystemPromptToggle />);

      fireEvent.click(screen.getByRole('switch'));

      expect(mockMutate).toHaveBeenCalledWith(
        { enabled: false },
        expect.anything()
      );
    });

    it('enables the system prompt when switched on', () => {
      mockUseSystemPrompt.mockReturnValue({
        data: { system_prompt: 'Be terse.', enabled: false },
        isLoading: false,
        isError: false
      });

      render(<SystemPromptToggle />);

      fireEvent.click(screen.getByRole('switch'));

      expect(mockMutate).toHaveBeenCalledWith({ enabled: true }, expect.anything());
    });

    it('does not accept input while an update is in flight', () => {
      mockUseUpdateSystemPrompt.mockReturnValue({
        mutate: mockMutate,
        isPending: true
      });

      render(<SystemPromptToggle />);

      fireEvent.click(screen.getByRole('switch'));

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });
});
