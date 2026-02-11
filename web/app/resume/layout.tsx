import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '이력서 관리 | 지원함',
  description: 'PDF 업로드 한 번으로 이력서를 자동으로 완성해드려요.',
  openGraph: {
    title: '이력서 관리 | 지원함',
    description: 'PDF 업로드 한 번으로 이력서를 자동으로 완성해드려요.',
  },
}

export default function ResumeLayout({ children }: { children: React.ReactNode }) {
  return children
}
