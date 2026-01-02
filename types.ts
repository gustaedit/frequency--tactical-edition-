
export enum HabitType {
  CHECKLIST = 'CHECKLIST',
  TIMER = 'TIMER',
}

export type DayOfWeek = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export interface MissionFrequency {
  type: 'weekly' | 'monthly' | 'once';
  days: (DayOfWeek | number | string)[]; // string para datas ISO em 'once'
}

export interface HabitLog {
  intensity: number; // 0-100
  duration?: number; // em segundos
  completedItems?: string[]; // IDs of checklist items completed
}

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface Class {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Mission {
  id: string;
  habitId: string;
  name: string;
  type: HabitType;
  frequency: MissionFrequency;
  completedDays: Record<string, HabitLog>;
  targetTime?: number;
  subItems?: ChecklistItem[];
  icon?: string;
}

export interface Habit {
  id: string;
  name: string;
  classId: string;
}

export interface Protocol {
  id: string;
  title: string;
  description: string;
  author: string;
  icon: string;
  habits: Partial<Mission>[];
}

export interface ConsistencyReport {
  hits: number;
  misses: number;
  rest: number;
  extra: number;
  accuracy: string;
}
