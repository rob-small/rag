import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import { ReasoningPanel } from '../ReasoningPanel';
import { useChatStore } from '../../../store/useChatStore';
import { useReasoningStore } from '../../../store/useReasoningStore';

describe('ReasoningPanel', () => {
  beforeEach(() => {
    useChatStore.getState().reset();
    useReasoningStore.getState().close();
  });

  it('renders nothing when no message is selected', () => {
    render(<ReasoningPanel />);
    expect(screen.queryByLabelText('Model reasoning')).not.toBeInTheDocument();
  });

  it('shows the reasoning for the selected message and closes', () => {
    useChatStore.getState().addMessage({
      id: 'm1',
      role: 'assistant',
      content: 'answer',
      timestamp: new Date().toISOString(),
      reasoning: 'step one, step two',
    });
    useReasoningStore.getState().open('m1');

    render(<ReasoningPanel />);
    expect(screen.getByText('step one, step two')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Close reasoning'));
    expect(useReasoningStore.getState().openMessageId).toBeNull();
  });

  it('explains when a message has no reasoning', () => {
    useChatStore.getState().addMessage({
      id: 'm2',
      role: 'assistant',
      content: 'answer',
      timestamp: new Date().toISOString(),
    });
    useReasoningStore.getState().open('m2');

    render(<ReasoningPanel />);
    expect(screen.getByText('No reasoning was returned for this message.')).toBeInTheDocument();
  });
});
