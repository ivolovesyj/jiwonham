import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '맞춤 채용공고 추천 | 지원함',
  description: 'AI가 분석한 나만의 맞춤 채용공고를 확인하세요. 직무, 지역, 경력에 딱 맞는 공고를 추천받고 한 번에 관리하세요.',
  openGraph: {
    title: '맞춤 채용공고 추천 | 지원함',
    description: 'AI가 분석한 나만의 맞춤 채용공고를 확인하세요.',
  },
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children
}
