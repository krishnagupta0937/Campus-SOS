import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhotoPicker } from '../components/upload/PhotoPicker';

describe('PhotoPicker Component — 2-Photo Invariant Enforcement', () => {
  it('0 photos → PASS: renders empty state with Add Photo action and 0 of 2 counter', () => {
    const handleChange = vi.fn();
    render(<PhotoPicker photos={[]} onChange={handleChange} maxPhotos={2} />);

    expect(screen.getByText(/0 of 2 photos attached/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Photo/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('1 photo → PASS: renders single photo thumbnail and allows attaching a second photo', () => {
    const handleChange = vi.fn();
    const photo1 = new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' });
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/photo1');

    render(<PhotoPicker photos={[photo1]} onChange={handleChange} maxPhotos={2} />);

    expect(screen.getByText(/1 of 2 photos attached/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Photo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Remove photo 1/i)).toBeInTheDocument();
  });

  it('2 photos → PASS: enforces maximum limit, hides Add Photo button, and shows limit warning', () => {
    const handleChange = vi.fn();
    const photo1 = new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' });
    const photo2 = new File(['content2'], 'photo2.jpg', { type: 'image/jpeg' });
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/photo');

    render(<PhotoPicker photos={[photo1, photo2]} onChange={handleChange} maxPhotos={2} />);

    expect(screen.getByText(/2 of 2 photos attached/i)).toBeInTheDocument();
    expect(screen.getByText(/Maximum photo limit of 2 reached/i)).toBeInTheDocument();
    expect(screen.queryByText(/Add Photo/i)).not.toBeInTheDocument();
  });

  it('3 photos → REJECT: gracefully rejects selecting 3 photos and displays error alert', () => {
    const handleChange = vi.fn();
    const photo1 = new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' });
    const photo2 = new File(['content2'], 'photo2.jpg', { type: 'image/jpeg' });
    const photo3 = new File(['content3'], 'photo3.jpg', { type: 'image/jpeg' });

    const { container } = render(<PhotoPicker photos={[]} onChange={handleChange} maxPhotos={2} />);

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();

    // User attempts to select 3 photos in input
    fireEvent.change(input, {
      target: {
        files: [photo1, photo2, photo3],
      },
    });

    // Verification: onChange is NOT called with 3 photos
    expect(handleChange).not.toHaveBeenCalled();

    // Verification: graceful error alert is displayed
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/Cannot upload 3 photos. Maximum 2 photos allowed./i);
  });

  it('allows removing an attached photo and resets available slots', () => {
    const handleChange = vi.fn();
    const photo1 = new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' });
    global.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/photo1');

    render(<PhotoPicker photos={[photo1]} onChange={handleChange} maxPhotos={2} />);

    const removeBtn = screen.getByLabelText(/Remove photo 1/i);
    fireEvent.click(removeBtn);

    expect(handleChange).toHaveBeenCalledWith([]);
  });
});
