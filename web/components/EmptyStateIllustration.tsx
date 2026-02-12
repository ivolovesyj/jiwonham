'use client'

interface EmptyStateIllustrationProps {
  type: 'no-applications' | 'no-results' | 'all-reviewed'
  size?: number
}

function NoApplications({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Box */}
      <rect x="25" y="40" width="70" height="55" rx="6" fill="#EDE9FE" stroke="#8B5CF6" strokeWidth="2" />
      <path d="M25 52C25 48.686 27.686 46 31 46H89C92.314 46 95 48.686 95 52V52H25V52Z" fill="#C4B5FD" />
      {/* Box flap left */}
      <path d="M25 46L40 28H60L50 46H25Z" fill="#DDD6FE" stroke="#8B5CF6" strokeWidth="2" strokeLinejoin="round" />
      {/* Box flap right */}
      <path d="M95 46L80 28H60L70 46H95Z" fill="#DDD6FE" stroke="#8B5CF6" strokeWidth="2" strokeLinejoin="round" />
      {/* Document 1 sticking out */}
      <rect x="38" y="20" width="28" height="36" rx="3" fill="white" stroke="#8B5CF6" strokeWidth="1.5" />
      <line x1="44" y1="28" x2="60" y2="28" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="33" x2="56" y2="33" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="38" x2="58" y2="38" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="43" x2="52" y2="43" stroke="#C4B5FD" strokeWidth="2" strokeLinecap="round" />
      {/* Document 2 */}
      <rect x="55" y="52" width="22" height="16" rx="2" fill="white" stroke="#A78BFA" strokeWidth="1" />
      <line x1="59" y1="57" x2="73" y2="57" stroke="#DDD6FE" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="59" y1="61" x2="70" y2="61" stroke="#DDD6FE" strokeWidth="1.5" strokeLinecap="round" />
      {/* Sparkle */}
      <circle cx="85" cy="25" r="3" fill="#8B5CF6" opacity="0.6" />
      <circle cx="30" cy="35" r="2" fill="#A78BFA" opacity="0.4" />
    </svg>
  )
}

function NoResults({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Magnifying glass */}
      <circle cx="52" cy="52" r="26" fill="#EFF6FF" stroke="#93C5FD" strokeWidth="3" />
      <circle cx="52" cy="52" r="18" fill="white" stroke="#BFDBFE" strokeWidth="2" />
      {/* Handle */}
      <line x1="72" y1="72" x2="92" y2="92" stroke="#93C5FD" strokeWidth="5" strokeLinecap="round" />
      {/* X mark inside lens */}
      <line x1="44" y1="44" x2="60" y2="60" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
      <line x1="60" y1="44" x2="44" y2="60" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round" />
      {/* Small dots */}
      <circle cx="90" cy="30" r="3" fill="#BFDBFE" opacity="0.6" />
      <circle cx="25" cy="80" r="2" fill="#93C5FD" opacity="0.4" />
      <circle cx="100" cy="65" r="2" fill="#BFDBFE" opacity="0.5" />
    </svg>
  )
}

function AllReviewed({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Checklist paper */}
      <rect x="28" y="15" width="54" height="72" rx="6" fill="white" stroke="#6EE7B7" strokeWidth="2" />
      {/* Check items */}
      <rect x="36" y="26" width="10" height="10" rx="2" fill="#D1FAE5" stroke="#34D399" strokeWidth="1.5" />
      <path d="M38 31L40 33L44 29" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="51" y1="31" x2="72" y2="31" stroke="#A7F3D0" strokeWidth="2" strokeLinecap="round" />

      <rect x="36" y="42" width="10" height="10" rx="2" fill="#D1FAE5" stroke="#34D399" strokeWidth="1.5" />
      <path d="M38 47L40 49L44 45" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="51" y1="47" x2="68" y2="47" stroke="#A7F3D0" strokeWidth="2" strokeLinecap="round" />

      <rect x="36" y="58" width="10" height="10" rx="2" fill="#D1FAE5" stroke="#34D399" strokeWidth="1.5" />
      <path d="M38 63L40 65L44 61" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="51" y1="63" x2="70" y2="63" stroke="#A7F3D0" strokeWidth="2" strokeLinecap="round" />

      <rect x="36" y="74" width="10" height="10" rx="2" fill="#D1FAE5" stroke="#34D399" strokeWidth="1.5" />
      <path d="M38 79L40 81L44 77" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="51" y1="79" x2="65" y2="79" stroke="#A7F3D0" strokeWidth="2" strokeLinecap="round" />

      {/* Sparkle top-right */}
      <path d="M88 22L90 18L92 22L96 24L92 26L90 30L88 26L84 24L88 22Z" fill="#FCD34D" />
      {/* Sparkle small */}
      <path d="M78 40L79 38L80 40L82 41L80 42L79 44L78 42L76 41L78 40Z" fill="#FCD34D" opacity="0.7" />
      {/* Star small */}
      <circle cx="92" cy="50" r="2.5" fill="#34D399" opacity="0.5" />
      <circle cx="22" cy="45" r="2" fill="#6EE7B7" opacity="0.4" />
    </svg>
  )
}

export function EmptyStateIllustration({ type, size = 120 }: EmptyStateIllustrationProps) {
  switch (type) {
    case 'no-applications':
      return <NoApplications size={size} />
    case 'no-results':
      return <NoResults size={size} />
    case 'all-reviewed':
      return <AllReviewed size={size} />
  }
}
