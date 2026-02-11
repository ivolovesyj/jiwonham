import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '마이페이지 | 지원함',
  description: '지원함 계정 및 개인 정보를 관리하세요.',
  openGraph: {
    title: '마이페이지 | 지원함',
    description: '지원함 계정 및 개인 정보를 관리하세요.',
  },
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
