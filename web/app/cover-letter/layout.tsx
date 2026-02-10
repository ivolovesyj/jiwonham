import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI 자기소개서 작성 | 지원함',
  description: 'AI가 경험 소재를 분석하고, STAR 기법으로 자기소개서를 작성해드립니다. 피드백 한 마디로 즉시 수정하세요.',
  openGraph: {
    title: 'AI 자기소개서 작성 | 지원함',
    description: 'AI가 경험 소재를 분석하고 자기소개서를 작성해드립니다.',
  },
}

export default function CoverLetterLayout({ children }: { children: React.ReactNode }) {
  return children
}
