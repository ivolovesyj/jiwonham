import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '맞춤 채용공고 추천 | 지원함',
  description: '직무·지역·경력에 맞는 AI 맞춤 채용공고를 추천해드려요.',
  openGraph: {
    title: '맞춤 채용공고 추천 | 지원함',
    description: '직무·지역·경력에 맞는 AI 맞춤 채용공고를 추천해드려요.',
  },
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children
}
