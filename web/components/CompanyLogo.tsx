'use client'

import { useState } from 'react'

interface CompanyLogoProps {
  companyName: string
  imageUrl?: string | null
  size?: number
}

const PALETTE = [
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#F59E0B', // amber
  '#10B981', // emerald
  '#6366F1', // indigo
  '#14B8A6', // teal
  '#F97316', // orange
]

function getColorForName(name: string): string {
  let sum = 0
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i)
  }
  return PALETTE[sum % PALETTE.length]
}

function getInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed[0].toUpperCase()
}

export function CompanyLogo({ companyName, imageUrl, size = 24 }: CompanyLogoProps) {
  const [imgError, setImgError] = useState(false)

  if (imageUrl && !imgError) {
    return (
      <img
        src={imageUrl}
        alt={companyName}
        width={size}
        height={size}
        className="rounded-md object-contain bg-gray-50 border border-gray-100 flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    )
  }

  const bgColor = getColorForName(companyName)
  const initial = getInitial(companyName)
  const fontSize = Math.round(size * 0.45)

  return (
    <div
      className="rounded-md flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
        fontSize,
        fontWeight: 700,
        color: '#fff',
        lineHeight: 1,
      }}
    >
      {initial}
    </div>
  )
}
