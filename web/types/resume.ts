export type SectionType =
  | 'personal'
  | 'summary'
  | 'education'
  | 'experience'
  | 'certification'
  | 'language'
  | 'skills'
  | 'activity'
  | 'award'
  | 'links'

export const SECTION_LABELS: Record<SectionType, string> = {
  personal: '인적사항',
  summary: '한줄 소개',
  education: '학력',
  experience: '경력사항',
  certification: '자격증',
  language: '어학',
  skills: '보유 역량',
  activity: '대외활동',
  award: '수상경력',
  links: '링크',
}

export const DEFAULT_SECTION_ORDER: SectionType[] = [
  'personal', 'summary', 'education', 'experience', 'certification',
  'language', 'skills', 'activity', 'award', 'links',
]

export const REQUIRED_SECTIONS: SectionType[] = ['education', 'experience']

export const DEFAULT_SECTION_VISIBILITY: Record<SectionType, boolean> = {
  personal: false,
  summary: true,
  education: true,
  experience: true,
  certification: true,
  language: true,
  skills: true,
  activity: false,
  award: false,
  links: false,
}

export type DegreeType = '고졸' | '전문학사' | '학사' | '석사' | '박사' | '기타'
export const DEGREE_OPTIONS: DegreeType[] = ['고졸', '전문학사', '학사', '석사', '박사', '기타']

export interface PersonalInfo {
  name: string
  birth_date?: string
  phone?: string
  email?: string
  address?: string
}

export interface EducationItem {
  id: string
  school: string
  major: string
  degree: DegreeType
  start_date: string    // "YYYY-MM"
  end_date: string | null
  is_current: boolean
  gpa?: string
  note?: string
}

export interface ExperienceItem {
  id: string
  company: string
  department?: string
  position: string
  start_date: string
  end_date: string | null
  is_current: boolean
  tasks: string
  achievements?: string
}

export interface CertificationItem {
  id: string
  name: string
  issuer: string
  date: string    // "YYYY-MM"
}

export interface LanguageItem {
  id: string
  language: string
  test_name: string
  score: string
  date: string
}

export interface SkillItem {
  id: string
  label: string
  category?: string
}

export interface ActivityItem {
  id: string
  name: string
  organization: string
  start_date: string
  end_date: string | null
  is_current: boolean
  description?: string
}

export interface AwardItem {
  id: string
  name: string
  organization: string
  date: string
  description?: string
}

export interface LinkItem {
  id: string
  label: string
  url: string
}

export interface ResumeData {
  id: string
  user_id: string
  title: string
  is_default: boolean
  section_order: SectionType[]
  section_visibility: Record<SectionType, boolean>
  personal?: PersonalInfo | null
  summary: string
  education: EducationItem[]
  experience: ExperienceItem[]
  certification: CertificationItem[]
  language: LanguageItem[]
  skills: SkillItem[]
  activity: ActivityItem[]
  award: AwardItem[]
  links: LinkItem[]
  created_at: string
  updated_at: string
}
