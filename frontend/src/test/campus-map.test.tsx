import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CampusMap } from '../components/map/CampusMap';

describe('CampusMap Component', () => {
  it('renders correctly with zoom controls and legend', () => {
    render(<CampusMap height="300px" interactive />);

    expect(screen.getByTitle(/Zoom In/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Zoom Out/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Reset View/i)).toBeInTheDocument();
  });

  it('renders selected pin at correct relative position', () => {
    const selectedPin = { x: 0.5, y: 0.75 };
    render(
      <CampusMap
        height="300px"
        selectedPin={selectedPin}
        interactive
      />
    );

    expect(screen.getByText(/Pin placed: 50.0% X, 75.0% Y/i)).toBeInTheDocument();
  });

  it('renders multiple incident pins in view mode', () => {
    const pins = [
      { id: 'pin-1', x: 0.2, y: 0.3, type: 'emergency' as const, label: 'Fire Hazard' },
      { id: 'pin-2', x: 0.8, y: 0.6, type: 'standard' as const, label: 'Broken Gate' },
    ];

    render(<CampusMap pins={pins} height="400px" />);

    expect(screen.getByTitle('Fire Hazard')).toBeInTheDocument();
    expect(screen.getByTitle('Broken Gate')).toBeInTheDocument();
  });
});
