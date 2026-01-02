
import { Habit, HabitType, Protocol, Mission } from '../types';

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const vaultService = {
  // Fix: Changed signature to use Mission instead of Habit, as the mapped objects contain Mission properties.
  // Added habitId parameter as it is required for the Mission interface.
  importProtocol: (protocol: Protocol, currentMissions: Mission[], habitId: string = 'imported'): Mission[] => {
    const newMissions: Mission[] = protocol.habits.map(h => ({
      id: generateId(),
      habitId: habitId,
      name: h.name || 'Sem Nome',
      type: h.type || HabitType.CHECKLIST,
      // Fix: Provided a default MissionFrequency object instead of an empty array to satisfy the Mission interface.
      frequency: h.frequency || { type: 'weekly', days: [] },
      completedDays: {},
      targetTime: h.targetTime || 0,
      icon: h.icon || '🎯',
      subItems: h.subItems || [],
    }));
    return [...currentMissions, ...newMissions];
  },

  getTodayString: () => new Date().toISOString().split('T')[0],

  // Fix: Changed parameter type from Habit to Mission to access completedDays
  calculateIntensity: (mission: Mission, date: string): number => {
    // Access intensity from the HabitLog object
    return mission.completedDays[date]?.intensity || 0;
  }
};
