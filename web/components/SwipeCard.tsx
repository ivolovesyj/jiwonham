'use client'

import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from 'framer-motion'
import { JobCard } from './JobCard'
import { Job } from '@/types/job'
import { useEffect } from 'react'

interface SwipeCardProps {
  job: Job
  onAction: (action: 'pass' | 'hold' | 'apply') => void
  active: boolean
  triggerAction?: 'pass' | 'hold' | 'apply' | null
}

export function SwipeCard({ job, onAction, active, triggerAction }: SwipeCardProps) {
  const controls = useAnimation()

  useEffect(() => {
    if (triggerAction && active) {
      // 버튼 클릭 시 카드 날리기
      let direction = 0
      if (triggerAction === 'pass') direction = -1
      if (triggerAction === 'apply') direction = 1
      if (triggerAction === 'hold') direction = 0

      controls.start({
        x: direction * 1000,
        y: direction === 0 ? -1000 : 0, // 보류는 위로
        rotate: direction * 15,
        opacity: 0,
        transition: { duration: 0.5, ease: 'easeInOut' }
      }).then(() => {
        onAction(triggerAction)
      })
    }
  }, [triggerAction, active, controls, onAction])

  const handlePass = () => {
    if (active && !triggerAction) {
      controls.start({
        x: -1000,
        rotate: -15,
        opacity: 0,
        transition: { duration: 0.3, ease: 'easeOut' }
      }).then(() => onAction('pass'))
    }
  }

  const handleHold = () => {
    if (active && !triggerAction) {
      controls.start({
        y: -1000,
        opacity: 0,
        transition: { duration: 0.3, ease: 'easeOut' }
      }).then(() => onAction('hold'))
    }
  }

  const handleApply = () => {
    if (active && !triggerAction) {
      controls.start({
        x: 1000,
        rotate: 15,
        opacity: 0,
        transition: { duration: 0.3, ease: 'easeOut' }
      }).then(() => onAction('apply'))
    }
  }

  if (!active) return null

  return (
    <motion.div
      className="absolute top-0 left-0 right-0 mx-auto w-full max-w-md"
      animate={controls}
      initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
    >
      <JobCard
        job={job}
        onPass={handlePass}
        onHold={handleHold}
        onApply={handleApply}
        disabled={!!triggerAction}
      />
    </motion.div>
  )
}
