import React from 'react';

interface SchoolLogoProps {
  className?: string;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({ className = 'w-48 h-52' }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 240 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-xl"
        role="img"
        aria-label="Logo SMP Insan Teladan"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#003366" />
            <stop offset="50%" stopColor="#0a467e" />
            <stop offset="100%" stopColor="#001e39" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffe680" />
            <stop offset="50%" stopColor="#ffc72c" />
            <stop offset="100%" stopColor="#d49b00" />
          </linearGradient>
        </defs>

        {/* Outer Shield with Gold Edge */}
        <path
          d="M120 10 L215 45 C215 150 175 220 120 250 C65 220 25 150 25 45 Z"
          fill="url(#goldGrad)"
          stroke="#b8860b"
          strokeWidth="3"
        />

        {/* Inner Shield */}
        <path
          d="M120 22 L202 52 C202 143 166 206 120 234 C74 206 38 143 38 52 Z"
          fill="url(#shieldGrad)"
        />

        {/* Top Arc Stars */}
        <g fill="#ffc72c">
          <circle cx="120" cy="48" r="4.5" />
          <circle cx="95" cy="54" r="3.5" />
          <circle cx="145" cy="54" r="3.5" />
          <circle cx="72" cy="66" r="3" />
          <circle cx="168" cy="66" r="3" />
        </g>

        {/* Torch of Knowledge */}
        <path
          d="M120 72 C125 78 126 84 122 90 C128 84 127 76 120 72 Z"
          fill="#ff5722"
        />
        <path
          d="M117 76 C121 82 122 88 119 92 C123 88 123 80 117 76 Z"
          fill="#ffc72c"
        />
        <path
          d="M114 93 L126 93 L123 108 L117 108 Z"
          fill="url(#goldGrad)"
        />

        {/* Open Book of Wisdom */}
        <path
          d="M120 125 C108 116 85 116 70 124 L70 162 C85 154 108 154 120 163 C132 154 155 154 170 162 L170 124 C155 116 132 116 120 125 Z"
          fill="#ffffff"
          stroke="#ffc72c"
          strokeWidth="2.5"
        />
        <path d="M120 125 L120 163" stroke="#003366" strokeWidth="2" />
        {/* Book pages lines */}
        <path d="M78 133 C90 128 105 128 114 133" stroke="#90a4ae" strokeWidth="1.5" />
        <path d="M78 142 C90 137 105 137 114 142" stroke="#90a4ae" strokeWidth="1.5" />
        <path d="M78 151 C90 146 105 146 114 151" stroke="#90a4ae" strokeWidth="1.5" />

        <path d="M162 133 C150 128 135 128 126 133" stroke="#90a4ae" strokeWidth="1.5" />
        <path d="M162 142 C150 137 135 137 126 142" stroke="#90a4ae" strokeWidth="1.5" />
        <path d="M162 151 C150 146 135 146 126 151" stroke="#90a4ae" strokeWidth="1.5" />

        {/* Banner Ribbon at bottom */}
        <path
          d="M48 182 L120 192 L192 182 L185 204 L120 215 L55 204 Z"
          fill="url(#goldGrad)"
          stroke="#b8860b"
          strokeWidth="1.5"
        />
        <text
          x="120"
          y="201"
          textAnchor="middle"
          fill="#001e39"
          fontSize="10"
          fontWeight="800"
          letterSpacing="1"
          fontFamily="system-ui, sans-serif"
        >
          INSAN TELADAN
        </text>

        {/* Crest Title */}
        <text
          x="120"
          y="180"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="11"
          fontWeight="800"
          letterSpacing="2"
          fontFamily="system-ui, sans-serif"
        >
          SMP
        </text>
      </svg>
    </div>
  );
};
