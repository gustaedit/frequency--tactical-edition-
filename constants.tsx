
import { HabitType, Protocol, Class } from './types';

export const COLORS = {
  bg: '#0a0a0a',
  card: '#121212',
  accent: '#D4FF00', 
  muted: '#262626',
  text: '#E5E5E5',
  alert: '#FF4D00',
};

export const SYSTEM_CLASSES: Class[] = [
  { id: 'health', name: 'Saúde', icon: '❤️', color: '#FF4D00' },
  { id: 'focus', name: 'Foco/Estudo', icon: '📚', color: '#D4FF00' },
  { id: 'physical', name: 'Físico', icon: '💪', color: '#00FFCC' },
  { id: 'logistics', name: 'Logística', icon: '🏠', color: '#0066FF' },
  { id: 'mental', name: 'Mental', icon: '🧠', color: '#CC00FF' },
];

export const VAULT_PROTOCOLS: Protocol[] = [
  {
    id: 'resupply-basic',
    title: 'Operação Reabastecimento',
    description: 'Protocolo de logística doméstica para manter os suprimentos em dia.',
    author: 'Frequency Logistics',
    icon: '🏠',
    habits: [
      { 
        name: 'Lista de Compras Mensal', 
        type: HabitType.CHECKLIST, 
        frequency: { type: 'monthly', days: [1, 15] },
        subItems: [
          { id: '1', text: 'Arroz 5kg' },
          { id: '2', text: 'Proteína' },
          { id: '3', text: 'Limpeza' }
        ]
      },
    ],
  }
];
