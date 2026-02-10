import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '로그인 | 지원함',
  description: '지원함에 로그인하고 채용공고 추천, 지원 현황 관리, AI 자기소개서 작성 기능을 이용하세요.',
  openGraph: {
    title: '로그인 | 지원함',
    description: '지원함에 로그인하고 채용 관리를 시작하세요.',
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
