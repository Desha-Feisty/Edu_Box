import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SubmissionList from '../SubmissionList';

describe('SubmissionList', () => {
  it('renders submissions and calls onGrade', () => {
    const submissions = [{ id: 's1', studentName: 'Alice', submittedAt: 'now' }];
    const onGrade = vi.fn();
    render(<SubmissionList submissions={submissions} onGrade={onGrade} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /grade/i }));
    expect(onGrade).toHaveBeenCalledWith(submissions[0]);
  });
});
