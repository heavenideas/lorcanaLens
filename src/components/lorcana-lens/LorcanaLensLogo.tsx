
import type React from 'react';

const LorcanaLensLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    {...props} // Allows passing className, width, height, etc.
  >
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 1 }} />
        <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 1 }} />
      </linearGradient>
      <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
        <feOffset dx="1" dy="1" />
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <rect width="100" height="100" rx="20" ry="20" fill="url(#grad1)" filter="url(#dropShadow)" />
    {/* Magnifying glass shape */}
    <circle cx="45" cy="45" r="25" fill="none" stroke="hsl(var(--primary-foreground))" strokeWidth="6" />
    <line x1="65" y1="65" x2="80" y2="80" stroke="hsl(var(--primary-foreground))" strokeWidth="8" strokeLinecap="round" />
    {/* Abstract card shapes inside the lens */}
    <rect x="30" y="35" width="15" height="20" rx="2" ry="2" fill="hsl(var(--primary-foreground))" opacity="0.7" transform="rotate(-10 37.5 45)" />
    <rect x="48" y="32" width="15" height="20" rx="2" ry="2" fill="hsl(var(--primary-foreground))" opacity="0.5" transform="rotate(15 55.5 42)" />
  </svg>
);

export default LorcanaLensLogo;

    