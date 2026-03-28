interface RapidmailLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

export function RapidmailLogo({
  className = "",
  showText = true,
  size = "md",
}: RapidmailLogoProps) {
  const sizes = {
    sm: { iconSize: 28, fontSize: 18 },
    md: { iconSize: 36, fontSize: 24 },
    lg: { iconSize: 48, fontSize: 32 },
  };

  const { iconSize, fontSize } = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon: Envelope with speed lines */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Speed lines */}
        <g className="text-brand-gold">
          <line x1="2" y1="14" x2="12" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="2" y1="20" x2="8" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="2" y1="26" x2="10" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Envelope */}
        <g className="text-brand-gold">
          {/* Envelope body */}
          <rect
            x="16"
            y="14"
            width="28"
            height="20"
            rx="2"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
          />

          {/* Envelope flap */}
          <path
            d="M16 16 L30 26 L44 16"
            stroke="currentColor"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </svg>

      {/* Text */}
      {showText && (
        <span
          className="font-semibold tracking-tight text-brand-gold"
          style={{ fontSize: `${fontSize}px` }}
        >
          Rapidmail
        </span>
      )}
    </div>
  );
}
