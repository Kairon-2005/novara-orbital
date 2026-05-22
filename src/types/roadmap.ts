export interface StudentProfile {
  currentYear: string
  currentSchool: string
  currentCurriculum: string
  targetUniversity: string
  targetProgramme: string
  interests: string
  budgetRange: string
  englishLevel: string
}

export interface RoadmapMilestone {
  type: 'exam' | 'competition' | 'cca' | 'application' | 'academic' | 'other'
  title: string
  description: string
  month?: number       // 1-12, optional
  dueDate?: string     // ISO date string
}

export interface RoadmapYear {
  year: number          // e.g. 2025
  yearLabel: string     // e.g. "Year 10 / Secondary 4"
  keyMilestone: string  // one-sentence summary of the year
  milestones: RoadmapMilestone[]
}

export interface GeneratedRoadmap {
  years: RoadmapYear[]
  generatedFor: StudentProfile
}
