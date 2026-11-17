import React from 'react';

interface SmttLogoProps {
  className?: string;
  height?: number;
}

/**
 * Logo SMTT vectoriel haute définition sur fond transparent :
 * - Lettres S, M et dernier T en blanc pur (#FFFFFF) pour une lisibilité optimale sur fond sombre / bleu marine.
 * - T stylisé et arc supérieur en rouge/corail d'origine (#E63946).
 */
export default function SmttLogo({ className = '', height = 34 }: SmttLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 162 54"
      height={height}
      style={{ height: `${height}px`, width: 'auto' }}
      className={`shrink-0 select-none ${className}`}
      role="img"
      aria-label="Logo SMTT"
      fill="none"
    >
      {/* Arc supérieur rouge/corail */}
      <path
        d="M 81 13.5 C 97 5.0, 125 3.8, 148.5 12.2 C 150.6 13.0, 151.3 14.9, 149.8 16.2 C 148.4 17.3, 146.0 16.8, 143.8 15.6 C 123.0 8.0, 99.5 8.8, 81 13.5 Z"
        fill="#E63946"
      />

      {/* Lettre S */}
      <path
        d="M 30.5 23.2 C 28.4 20.5, 24.6 19.6, 20.8 19.6 C 15.2 19.6, 11.6 22.4, 11.6 26.6 C 11.6 31.1, 15.8 32.7, 21.4 33.9 C 27.2 35.1, 31.2 36.8, 31.2 41.6 C 31.2 46.1, 27.2 48.6, 21.4 48.6 C 16.5 48.6, 12.6 47.0, 10.6 44.2"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinecap="butt"
        fill="none"
      />

      {/* Lettre M */}
      <path
        d="M 45.5 48.4 L 45.5 20.4 L 61.5 45.8 L 77.5 20.4 L 77.5 48.4"
        stroke="#FFFFFF"
        strokeWidth="3.5"
        strokeLinejoin="bevel"
        strokeLinecap="butt"
        fill="none"
      />

      {/* T stylisé en rouge/corail */}
      <path
        d="M 97.5 15.2 C 97.5 14.0, 98.5 13.4, 100.2 13.4 L 105.0 13.4 L 105.0 40.4 C 105.0 43.2, 106.7 44.6, 110.2 44.6 C 111.9 44.6, 113.4 44.2, 114.4 43.6 L 115.5 46.8 C 113.7 48.1, 111.3 48.8, 108.2 48.8 C 101.6 48.8, 97.5 45.2, 97.5 39.6 Z"
        fill="#E63946"
      />

      {/* Dernier T en blanc */}
      <path
        d="M 122.5 21.4 L 151.5 21.4 M 137.0 21.4 L 137.0 48.4"
        stroke="#FFFFFF"
        strokeWidth="3.6"
        strokeLinecap="butt"
        fill="none"
      />
    </svg>
  );
}
