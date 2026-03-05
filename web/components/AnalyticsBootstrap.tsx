'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initAnalytics, trackPageView } from '@/lib/analytics'

export function AnalyticsBootstrap() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    const pathWithQuery = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname
    trackPageView(pathWithQuery)
  }, [pathname, searchParams])

  return null
}

