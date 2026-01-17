
export interface Dimension {
  id: string;
  name: string;
  icon: string;
  colorClass: string;
  currentScore: number;
  targetScore: number;
}

export interface ActionPlanItem {
  id: string;
  category: string;
  title: string;
  priority: number;
  gap: number;
  status: 'critical' | 'steady' | 'moderate';
  tasks: string[];
  imageUrl: string;
}

export interface DailyHabit {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  completed: boolean;
  category: string;
  colorClass: string;
}

export interface User {
  id: string;
  email: string | null;
  displayName?: string;
  avatarUrl?: string;
  streakDays?: number;
}

export type AppView = 'SPLASH' | 'ASSESSMENT' | 'GOALS' | 'RADAR_RESULT' | 'ACTION_PLAN' | 'DAILY_TRACK' | 'PROGRESS' | 'SUPPORT' | 'AUTH';
