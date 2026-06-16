import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import GradeModal from '../GradeModal';
import axios from 'axios';
import telemetry from '../../../lib/telemetry';

vi.mock('axios');
vi.mock('../../../lib/telemetry', () => ({ track: vi.fn(), default: { track: vi.fn() } }));
// Vitest/Vite root prevents resolving files outside apps/frontend; mock the shared telemetry import path used by the component
vi.mock('../../../../packages/shared/src/telemetry', () => ({ default: { TEACHER_GRADE_SUBMIT: 'TEACHER_GRADE_SUBMIT' } }));

const mockAttempt = {
  attempt: { _id: 'att1' },
  responses: [
    { prompt: 'Write summary', questionType: 'written', points: 5, textAnswer: 'Answer', pointsAwarded: 0, aiFeedback: '' },
  ],
};

describe('GradeModal', () => {
  beforeEach(() => {
    axios.get.mockReset();
    axios.patch.mockReset();
  });

  it('loads attempt and allows grading', async () => {
    axios.get.mockResolvedValueOnce({ data: mockAttempt });
    axios.patch.mockResolvedValueOnce({ data: { success: true, score: 4, feedback: 'Good' } });

    const onUpdated = vi.fn();
    render(<GradeModal attemptId="att1" onClose={() => {}} onUpdated={onUpdated} />);

    // component fetch uses Authorization header; ensure GET called
    expect(axios.get).toHaveBeenCalledWith('/api/attempts/att1', expect.any(Object));

    await waitFor(() => expect(screen.getByText('Q: Write summary')).toBeInTheDocument());

    const scoreInput = screen.getByRole('spinbutton');
    fireEvent.change(scoreInput, { target: { value: '4' } });
    const save = screen.getByRole('button', { name: /save/i });

    fireEvent.click(save);

    await waitFor(() => expect(axios.patch).toHaveBeenCalled());
    expect(telemetry.track).toHaveBeenCalled();
    expect(onUpdated).toHaveBeenCalled();
  });
});
