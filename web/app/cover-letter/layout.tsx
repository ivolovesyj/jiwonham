import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI 자기소개서 작성 | 지원함',
  description: '공고 JD에 맞는 자소서 초안을 AI가 작성해드려요.',
  openGraph: {
    title: 'AI 자기소개서 작성 | 지원함',
    description: '공고 JD에 맞는 자소서 초안을 AI가 작성해드려요.',
  },
}

export default function CoverLetterLayout({ children }: { children: React.ReactNode }) {
  return children
}
