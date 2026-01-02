
import { Mission, ConsistencyReport, DayOfWeek, HabitLog } from '../types';
// Fix: Use named imports from root and sub-paths for consistency and to fix "not callable" errors in newer date-fns versions
import { 
  eachDayOfInterval, 
  format, 
  getDay, 
  subDays, 
  startOfDay, 
  endOfDay, 
  getDate 
} from 'date-fns';
import { parseISO } from 'date-fns/parseISO';

const DAY_MAP: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const statsService = {
  getHabitStats: (mission: Mission, period: 'week' | 'month' | 'year') => {
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'week': startDate = subDays(now, 7); break;
      case 'month': startDate = subDays(now, 30); break;
      case 'year': startDate = subDays(now, 365); break;
      default: startDate = subDays(now, 7);
    }

    const entries = Object.entries(mission.completedDays) as [string, HabitLog][];
    const logs = entries.filter(([date]) => parseISO(date) >= startDate);

    const totalTime = logs.reduce((acc, [_, log]) => acc + (log.duration || 0), 0);
    const totalCompletions = logs.length;
    const averageTimePerSession = totalCompletions > 0 ? totalTime / totalCompletions : 0;

    return {
      totalTime,
      totalCompletions,
      averageTimePerSession
    };
  },

  isMissionPlannedForDate: (mission: Mission, date: Date): boolean => {
    const { frequency } = mission;
    const dateStr = format(date, 'yyyy-MM-dd');

    if (frequency.type === 'weekly') {
      const dayName = DAY_MAP[getDay(date)];
      return frequency.days.includes(dayName);
    } else if (frequency.type === 'monthly') {
      const dayOfMonth = getDate(date);
      return frequency.days.includes(dayOfMonth);
    } else if (frequency.type === 'once') {
      return frequency.days.includes(dateStr);
    }
    return false;
  },

  getConsistencyReport: (mission: Mission, startDate: Date, endDate: Date): ConsistencyReport => {
    const days = eachDayOfInterval({ start: startOfDay(startDate), end: endOfDay(endDate) });
    const report = { hits: 0, misses: 0, rest: 0, extra: 0 };

    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const isPlanned = statsService.isMissionPlannedForDate(mission, day);
      const hasLog = !!mission.completedDays[dateStr];

      if (isPlanned && hasLog) {
        report.hits++;
      } else if (isPlanned && !hasLog) {
        report.misses++;
      } else if (!isPlanned && !hasLog) {
        report.rest++;
      } else if (!isPlanned && hasLog) {
        report.extra++;
      }
    });

    const totalPlanned = report.hits + report.misses;
    const accuracy = totalPlanned > 0 
      ? Math.round((report.hits / totalPlanned) * 100) + '%'
      : '0%';

    return { ...report, accuracy };
  }
};
