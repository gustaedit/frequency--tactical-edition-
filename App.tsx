
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  PieChart as ChartIcon, 
  Package, 
  Settings, 
  Plus, 
  Flame,
  Zap,
  CheckCircle2,
  Clock,
  MoreVertical,
  X,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Trash2,
  Palette,
  Smile,
  Repeat,
  ZapOff,
  Filter,
  CalendarDays,
  Pencil,
  AlertOctagon,
  Lock
} from 'lucide-react';
import { 
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
// Fix: Use named import for format and specific sub-path named import for parseISO to avoid resolution errors in some environments
import { format } from 'date-fns';
import { parseISO } from 'date-fns/parseISO';
import ptBR from 'date-fns/locale/pt-BR';

import { 
  Mission, 
  Habit, 
  Class, 
  HabitType, 
  DayOfWeek, 
  MissionFrequency,
  HabitLog
} from './types';
import { SYSTEM_CLASSES, VAULT_PROTOCOLS } from './constants';
import { vaultService, generateId } from './services/vaultService';
import { statsService } from './services/statsService';
import Heatmap from './components/Heatmap';
import Timer from './components/Timer';

const DAY_OPTIONS: { label: string, value: DayOfWeek }[] = [
  { label: 'D', value: 'sun' },
  { label: 'S', value: 'mon' },
  { label: 'T', value: 'tue' },
  { label: 'Q', value: 'wed' },
  { label: 'Q', value: 'thu' },
  { label: 'S', value: 'fri' },
  { label: 'S', value: 'sat' },
];

const TACTICAL_COLORS = [
  '#D4FF00', '#FF4D00', '#00FFCC', '#0066FF', '#CC00FF', 
  '#FF0066', '#FFCC00', '#99FF00', '#00CCFF', '#FFFFFF'
];

const TACTICAL_EMOJIS = [
  '🎯', '🏠', '💪', '📚', '🧠', '💼', '⚡', '🛡️', '🛠️', '🥗', '🧘', '💰', '🚀', '🔥', '🎨', '⚙️', '📈', '🔋', '📅', '🏆'
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'hoje' | 'habitos' | 'estatisticas' | 'vault'>('hoje');
  const [selectedSectorFilter, setSelectedSectorFilter] = useState<string | null>(null);
  const [editingMissionId, setEditingMissionId] = useState<string | null>(null);
  
  const [missions, setMissions] = useState<Mission[]>(() => {
    const saved = localStorage.getItem('freq_missions');
    return saved ? JSON.parse(saved) : [];
  });
  const [userHabits, setUserHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('freq_habits_groups');
    return saved ? JSON.parse(saved) : [];
  });
  const [customClasses, setCustomClasses] = useState<Class[]>(() => {
    const saved = localStorage.getItem('freq_custom_classes');
    return saved ? JSON.parse(saved) : SYSTEM_CLASSES;
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);

  const todayStr = vaultService.getTodayString();
  const todayDate = new Date();

  // Form State Mission
  const [formMission, setFormMission] = useState({
    name: '',
    habitName: '',
    classId: customClasses[0]?.id || 'focus',
    type: HabitType.CHECKLIST,
    targetMinutes: 30,
    frequencyType: 'weekly' as 'weekly' | 'monthly' | 'once',
    frequencyDays: ['mon', 'tue', 'wed', 'thu', 'fri'] as (DayOfWeek | number | string)[],
    onceDate: todayStr,
    subItems: [] as string[]
  });
  const [newSubItem, setNewSubItem] = useState('');

  // Form State Class
  const [formClass, setFormClass] = useState({
    name: '',
    icon: '🎯',
    color: '#D4FF00'
  });

  useEffect(() => {
    localStorage.setItem('freq_missions', JSON.stringify(missions));
    localStorage.setItem('freq_habits_groups', JSON.stringify(userHabits));
    localStorage.setItem('freq_custom_classes', JSON.stringify(customClasses));
  }, [missions, userHabits, customClasses]);

  const allSectors = useMemo(() => customClasses, [customClasses]);

  const handleCompleteMission = (id: string, intensity: number = 100, duration?: number, completedItems?: string[]) => {
    if (window.navigator.vibrate) window.navigator.vibrate(50);
    setMissions(prev => prev.map(m => {
      if (m.id === id) {
        const newCompleted = { ...m.completedDays };
        newCompleted[todayStr] = { 
          intensity, 
          duration: duration || (m.type === HabitType.TIMER ? (duration || m.targetTime || 0) : 0),
          completedItems: completedItems || newCompleted[todayStr]?.completedItems
        };
        return { ...m, completedDays: newCompleted };
      }
      return m;
    }));
  };

  const openEditModal = (mission: Mission) => {
    const habit = userHabits.find(h => h.id === mission.habitId);
    setEditingMissionId(mission.id);
    setFormMission({
      name: mission.name,
      habitName: habit?.name || '',
      classId: habit?.classId || allSectors[0]?.id,
      type: mission.type,
      targetMinutes: mission.targetTime ? Math.round(mission.targetTime / 60) : 30,
      frequencyType: mission.frequency.type,
      frequencyDays: mission.frequency.days,
      onceDate: mission.frequency.type === 'once' ? (mission.frequency.days[0] as string) : todayStr,
      subItems: mission.subItems?.map(si => si.text) || []
    });
    setShowAddModal(true);
  };

  const handleDeleteMission = (id: string) => {
    if (window.confirm('ABORTAR OPERAÇÃO: Confirmar destruição permanente de todos os dados desta missão?')) {
      // Functional update to ensure we have the latest state
      setMissions(prev => prev.filter(m => m.id !== id));
      
      // Clear UI state if editing
      if (editingMissionId === id) {
        setShowAddModal(false);
        setEditingMissionId(null);
      }
    }
  };

  const handleSaveMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMission.name || !formMission.habitName) return;

    // Tactical Check: No empty checklists allowed
    if (formMission.type === HabitType.CHECKLIST && formMission.subItems.length === 0) {
      alert("ERRO DE PROTOCOLO: O tipo Checklist exige ao menos 1 item operacional.");
      return;
    }

    let habit = userHabits.find(h => h.name.toLowerCase() === formMission.habitName.toLowerCase());
    if (!habit) {
      habit = { id: generateId(), name: formMission.habitName, classId: formMission.classId };
      setUserHabits(prev => [...prev, habit!]);
    } else {
      if (habit.classId !== formMission.classId) {
        setUserHabits(prev => prev.map(h => h.id === habit!.id ? { ...h, classId: formMission.classId } : h));
      }
    }

    const frequencyDays = formMission.frequencyType === 'once' ? [formMission.onceDate] : formMission.frequencyDays;

    if (editingMissionId) {
      setMissions(prev => prev.map(m => {
        if (m.id === editingMissionId) {
          return {
            ...m,
            habitId: habit!.id,
            name: formMission.name,
            type: formMission.type,
            frequency: {
              type: formMission.frequencyType,
              days: frequencyDays
            },
            targetTime: formMission.type === HabitType.TIMER ? formMission.targetMinutes * 60 : undefined,
            subItems: formMission.subItems.length > 0 
              ? formMission.subItems.map(text => {
                  const existing = m.subItems?.find(si => si.text === text);
                  return { id: existing?.id || generateId(), text };
                }) 
              : undefined,
          };
        }
        return m;
      }));
    } else {
      const mission: Mission = {
        id: generateId(),
        habitId: habit.id,
        name: formMission.name,
        type: formMission.type,
        frequency: {
          type: formMission.frequencyType,
          days: frequencyDays
        },
        completedDays: {},
        targetTime: formMission.type === HabitType.TIMER ? formMission.targetMinutes * 60 : undefined,
        subItems: formMission.subItems.length > 0 
          ? formMission.subItems.map(text => ({ id: generateId(), text })) 
          : undefined,
        icon: '🎯'
      };
      setMissions(prev => [...prev, mission]);
    }

    setShowAddModal(false);
    setEditingMissionId(null);
    setFormMission({ 
      name: '', 
      habitName: '', 
      classId: allSectors[0]?.id || 'focus', 
      type: HabitType.CHECKLIST, 
      targetMinutes: 30, 
      frequencyType: 'weekly',
      frequencyDays: ['mon', 'tue', 'wed', 'thu', 'fri'], 
      onceDate: todayStr,
      subItems: [] 
    });
  };

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClass.name) return;
    const newClass: Class = {
      id: generateId(),
      name: formClass.name,
      icon: formClass.icon,
      color: formClass.color
    };
    setCustomClasses(prev => [...prev, newClass]);
    setShowClassModal(false);
    setFormClass({ name: '', icon: '🎯', color: '#D4FF00' });
  };

  const handleToggleFreqDay = (val: DayOfWeek | number | string) => {
    setFormMission(prev => ({
      ...prev,
      frequencyDays: prev.frequencyDays.includes(val) 
        ? prev.frequencyDays.filter(d => d !== val)
        : [...prev.frequencyDays, val]
    }));
  };

  const addSubItem = () => {
    if (newSubItem.trim()) {
      setFormMission(prev => ({ ...prev, subItems: [...prev.subItems, newSubItem.trim()] }));
      setNewSubItem('');
    }
  };

  const removeSubItem = (index: number) => {
    setFormMission(prev => ({ ...prev, subItems: prev.subItems.filter((_, i) => i !== index) }));
  };

  const isChecklistInvalid = formMission.type === HabitType.CHECKLIST && formMission.subItems.length === 0;

  const heatmapData = useMemo(() => {
    const data: Record<string, number> = {};
    const filteredMissions = selectedSectorFilter
      ? missions.filter(m => {
          const habit = userHabits.find(h => h.id === m.habitId);
          return habit?.classId === selectedSectorFilter;
        })
      : missions;

    filteredMissions.forEach(m => {
      (Object.entries(m.completedDays) as [string, HabitLog][]).forEach(([date, log]) => {
        data[date] = Math.min(100, (data[date] || 0) + log.intensity / (filteredMissions.length || 1));
      });
    });
    return data;
  }, [missions, selectedSectorFilter, userHabits]);

  const activeMissionsToday = useMemo(() => {
    return missions.filter(m => statsService.isMissionPlannedForDate(m, todayDate));
  }, [missions, todayDate]);

  const dailyProgress = useMemo(() => {
    if (activeMissionsToday.length === 0) return 100;
    const completed = activeMissionsToday.filter(m => m.completedDays[todayStr]).length;
    return Math.round((completed / activeMissionsToday.length) * 100);
  }, [activeMissionsToday, todayStr]);

  const groupedMissions = useMemo(() => {
    const groups: Record<string, { class: Class, habit: Habit, missions: Mission[] }> = {};
    const missionsToDisplay = selectedSectorFilter 
      ? activeMissionsToday.filter(m => {
          const habit = userHabits.find(h => h.id === m.habitId);
          return habit?.classId === selectedSectorFilter;
        })
      : activeMissionsToday;

    missionsToDisplay.forEach(m => {
      const habit = userHabits.find(h => h.id === m.habitId);
      if (!habit) return;
      const classObj = allSectors.find(c => c.id === habit.classId) || allSectors[0];
      const key = habit.id;
      if (!groups[key]) {
        groups[key] = { class: classObj, habit, missions: [] };
      }
      groups[key].missions.push(m);
    });
    return Object.values(groups);
  }, [activeMissionsToday, userHabits, allSectors, selectedSectorFilter]);

  const isNewHabit = !userHabits.find(h => h.name.toLowerCase() === formMission.habitName.toLowerCase());

  const SectorFilterBar = () => (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#555] flex items-center gap-2">
          <Filter size={12} /> Concentração Setorial
        </h3>
        {selectedSectorFilter && (
          <button 
            onClick={() => setSelectedSectorFilter(null)}
            className="text-[9px] font-bold text-[#FF4D00] uppercase hover:underline"
          >
            Resetar Alvos
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 pb-2">
        <button 
          onClick={() => setSelectedSectorFilter(null)}
          className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${!selectedSectorFilter ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'bg-[#121212] border-[#262626] text-[#555] hover:border-[#333]'}`}
        >
          Todos
        </button>
        {allSectors.map(sector => (
          <button 
            key={sector.id}
            onClick={() => setSelectedSectorFilter(sector.id)}
            className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${selectedSectorFilter === sector.id ? 'shadow-lg' : 'opacity-60 hover:opacity-100'}`}
            style={{ 
              borderColor: selectedSectorFilter === sector.id ? sector.color : '#262626',
              backgroundColor: selectedSectorFilter === sector.id ? sector.color : '#121212',
              color: selectedSectorFilter === sector.id ? '#000' : '#888',
              boxShadow: selectedSectorFilter === sector.id ? `0 0 15px ${sector.color}44` : 'none'
            }}
          >
            <span>{sector.icon}</span> {sector.name}
          </button>
        ))}
      </div>
    </section>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0a0a0a] text-[#E5E5E5] selection:bg-[#D4FF00] selection:text-black">
      
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#121212] border-r border-[#262626] p-6 fixed h-full">
        <div className="flex items-center space-x-3 mb-12">
          <div className="w-8 h-8 bg-[#D4FF00] rounded flex items-center justify-center shadow-[0_0_15px_#D4FF0044]">
            <Zap className="text-black" size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tighter uppercase">Frequency</h1>
        </div>
        <nav className="flex-1 space-y-2">
          <NavItem icon={<LayoutDashboard size={18} />} label="Hoje" active={activeTab === 'hoje'} onClick={() => setActiveTab('hoje')} />
          <NavItem icon={<Target size={18} />} label="Inventário" active={activeTab === 'habitos'} onClick={() => setActiveTab('habitos')} />
          <NavItem icon={<ChartIcon size={18} />} label="Análise" active={activeTab === 'estatisticas'} onClick={() => setActiveTab('estatisticas')} />
          <NavItem icon={<Package size={18} />} label="Vault" active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} />
        </nav>
        <div className="mt-auto pt-6 border-t border-[#262626]">
          <button onClick={() => { setEditingMissionId(null); setShowAddModal(true); }} className="w-full py-3 mb-4 bg-[#D4FF00] text-black font-bold rounded-lg hover:opacity-90 shadow-[0_0_20px_#D4FF0022]">
            <Plus size={18} className="inline mr-2" /> NOVA MISSÃO
          </button>
        </div>
      </aside>

      <main className="flex-1 lg:ml-64 pb-24 lg:pb-0 min-h-screen overflow-y-auto">
        <header className="p-6 flex justify-between items-center bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-10 border-b border-[#262626]">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#555]">Prontidão Tática</h2>
            <p className="text-lg font-bold">{format(todayDate, "eeee, dd 'de' MMMM", { locale: ptBR })}</p>
          </div>
          <div className="flex items-center space-x-3">
             <div className="flex items-center space-x-1 px-3 py-1 bg-[#1a1a1a] border border-[#333] rounded-full text-[#FF4D00]">
               <Flame size={14} /> <span className="text-xs font-bold uppercase tracking-tighter">Status Ativo</span>
             </div>
          </div>
        </header>

        <div className="p-6 max-w-4xl mx-auto space-y-8">
          {activeTab === 'hoje' && (
            <>
              <section className="bg-[#121212] p-6 rounded-2xl border border-[#262626] relative overflow-hidden">
                <div className="flex justify-between items-end relative z-10">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-[#555]">Eficiência Operacional Geral</span>
                    <div className="text-5xl font-bold mt-1">{dailyProgress}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#555] uppercase font-bold">Patente</div>
                    <div className="text-[#D4FF00] font-bold uppercase tracking-widest text-xs">Comandante de Campo</div>
                  </div>
                </div>
                <div className="w-full h-2 bg-[#1a1a1a] rounded-full mt-6 overflow-hidden">
                  <div className="h-full bg-[#D4FF00] transition-all duration-1000" style={{ width: `${dailyProgress}%` }} />
                </div>
              </section>

              <SectorFilterBar />

              <section className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-[#555]">
                    {selectedSectorFilter ? `MISSÕES: ${allSectors.find(s => s.id === selectedSectorFilter)?.name.toUpperCase()}` : 'LOG DE MISSÕES GLOBAL'}
                  </h3>
                </div>
                
                {groupedMissions.length === 0 ? (
                  <div className="text-center py-20 border-2 border-dashed border-[#262626] rounded-2xl">
                    <ZapOff className="mx-auto mb-4 text-[#333]" size={48} />
                    <p className="text-[#555] mb-2 font-bold uppercase text-xs">
                      {selectedSectorFilter ? 'Sem alvos designados para este setor' : 'Sem alvos designados'}
                    </p>
                    {selectedSectorFilter ? (
                      <button onClick={() => setSelectedSectorFilter(null)} className="text-[#D4FF00] text-[10px] uppercase font-bold hover:underline">Ver todas as missões</button>
                    ) : (
                      <button onClick={() => setShowAddModal(true)} className="text-[#D4FF00] text-[10px] uppercase font-bold hover:underline">Iniciar nova operação</button>
                    )}
                  </div>
                ) : (
                  groupedMissions.map(group => (
                    <div key={group.habit.id} className="space-y-3">
                      <div className="flex items-center space-x-2 px-2">
                        <span className="text-xs" style={{ color: group.class.color }}>{group.class.icon}</span>
                        <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: group.class.color }}>
                          {group.class.name} // {group.habit.name}
                        </h4>
                      </div>
                      <div className="grid gap-3">
                        {group.missions.map(mission => (
                          <MissionCard 
                            key={mission.id} 
                            mission={mission} 
                            color={group.class.color}
                            isCompleted={!!mission.completedDays[todayStr]}
                            onComplete={(intensity, duration, items) => handleCompleteMission(mission.id, intensity, duration, items)} 
                            onEdit={() => openEditModal(mission)}
                            onDelete={() => handleDeleteMission(mission.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </section>
            </>
          )}

          {activeTab === 'habitos' && (
            <section className="space-y-8">
               <div className="space-y-4">
                 <div className="flex justify-between items-center">
                   <h3 className="text-sm font-bold uppercase tracking-widest text-[#888]">Setores Ativos</h3>
                   <button onClick={() => setShowClassModal(true)} className="p-2 bg-[#D4FF00] text-black rounded-full shadow-lg"><Plus size={20}/></button>
                 </div>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   {allSectors.map(c => (
                     <div key={c.id} className={`bg-[#121212] p-4 rounded-xl border flex flex-col items-center text-center relative group hover:border-[#D4FF0044] transition-all ${selectedSectorFilter === c.id ? 'border-[#D4FF00] shadow-[0_0_15px_#D4FF0022]' : 'border-[#262626]'}`}>
                       <div className="text-2xl mb-2" style={{ color: c.color }}>{c.icon}</div>
                       <div className="font-bold text-[10px] uppercase tracking-tighter">{c.name}</div>
                       <button 
                         onClick={() => setCustomClasses(customClasses.filter(cl => cl.id !== c.id))}
                         className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-[#444] hover:text-[#FF4D00] transition-opacity"
                       >
                         <Trash2 size={12}/>
                       </button>
                     </div>
                   ))}
                 </div>
               </div>

               <SectorFilterBar />

               <div className="space-y-4">
                 <h3 className="text-sm font-bold uppercase tracking-widest text-[#888]">Banco de Missões</h3>
                 <div className="grid gap-3">
                   {missions
                    .filter(m => !selectedSectorFilter || userHabits.find(h => h.id === m.habitId)?.classId === selectedSectorFilter)
                    .map(m => {
                     const habit = userHabits.find(h => h.id === m.habitId);
                     const classObj = allSectors.find(c => c.id === habit?.classId);
                     return (
                       <div key={m.id} className="bg-[#121212] p-4 rounded-xl border border-[#262626] flex items-center justify-between group hover:border-[#333] transition-colors">
                         <div className="flex items-center space-x-4">
                            <div className="text-xl" style={{ color: classObj?.color }}>{classObj?.icon}</div>
                            <div>
                               <div className="text-[11px] font-bold uppercase tracking-widest">{m.name}</div>
                               <div className="text-[9px] text-[#555] font-bold uppercase">{habit?.name} • <MissionFreqBadge mission={m} /></div>
                            </div>
                         </div>
                         <div className="flex items-center space-x-2">
                            <button onClick={() => openEditModal(m)} className="p-2 text-[#555] hover:text-[#D4FF00] transition-colors"><Pencil size={16}/></button>
                            <button onClick={() => handleDeleteMission(m.id)} className="p-2 text-[#555] hover:text-[#FF4D00] transition-colors"><Trash2 size={16}/></button>
                         </div>
                       </div>
                     );
                   })}
                   {missions.filter(m => !selectedSectorFilter || userHabits.find(h => h.id === m.habitId)?.classId === selectedSectorFilter).length === 0 && (
                     <div className="py-12 text-center text-[#333] border border-dashed border-[#262626] rounded-xl text-xs uppercase font-bold tracking-widest">Nenhuma missão neste vetor</div>
                   )}
                 </div>
               </div>
            </section>
          )}

          {activeTab === 'estatisticas' && (
            <section className="space-y-6">
              <SectorFilterBar />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#888]">
                    {selectedSectorFilter ? `Consistência: ${allSectors.find(s => s.id === selectedSectorFilter)?.name.toUpperCase()}` : 'Consistência Tática Global'}
                  </h3>
                </div>
                <Heatmap data={heatmapData} />
              </div>

              <div className="bg-[#121212] p-6 rounded-2xl border border-[#262626]">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#888] mb-6">Frequência por Vetor</h3>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={allSectors.map(c => ({ 
                            name: c.name, 
                            value: missions.filter(m => userHabits.find(h => h.id === m.habitId)?.classId === c.id).length 
                          })).filter(d => d.value > 0)} 
                          innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                        >
                          {allSectors.map((c, i) => (
                            <Cell 
                              key={i} 
                              fill={c.color} 
                              stroke={selectedSectorFilter === c.id ? '#fff' : 'none'}
                              strokeWidth={2}
                              opacity={!selectedSectorFilter || selectedSectorFilter === c.id ? 1 : 0.3}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', borderRadius: '8px', fontSize: '10px' }} />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'vault' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {VAULT_PROTOCOLS.map(protocol => (
                <div key={protocol.id} className="bg-[#121212] border border-[#262626] rounded-2xl p-6 hover:border-[#D4FF0044] transition-all group">
                  <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{protocol.icon}</div>
                  <h4 className="font-bold text-sm uppercase tracking-widest">{protocol.title}</h4>
                  <p className="text-[10px] text-[#555] uppercase font-bold mt-1 mb-4">Protocolo Alpha // v1.2</p>
                  <p className="text-xs text-[#888] mb-6 line-clamp-2">{protocol.description}</p>
                  <button className="w-full py-3 bg-[#1a1a1a] border border-[#333] rounded-lg text-[10px] font-bold hover:bg-[#D4FF00] hover:text-black transition-colors uppercase tracking-[0.2em]">Instalar Protocolo</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Creation Modal Mission */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-[#121212] w-full max-w-lg border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#262626] flex justify-between items-center bg-[#1a1a1a]">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#D4FF00]">{editingMissionId ? 'Ajustar Parâmetros' : 'Nova Operação'}</h3>
              <button onClick={() => { setShowAddModal(false); setEditingMissionId(null); }} className="text-[#555] hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleSaveMission} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scroll">
              
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#555] tracking-widest">Projeto (Célula)</label>
                <input 
                  type="text" value={formMission.habitName} onChange={e => setFormMission({...formMission, habitName: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3 focus:border-[#D4FF00] outline-none text-sm"
                  placeholder="Ex: Estudos, Shape de Verão, Lab..."
                />
              </div>

              {(isNewHabit || editingMissionId) && formMission.habitName.length > 2 && (
                <div className="space-y-3 p-4 bg-white/5 rounded-xl border border-dashed border-[#333]">
                   <label className="text-[10px] uppercase font-bold text-[#D4FF00] tracking-widest block mb-2">Vincular a qual Setor?</label>
                   <div className="grid grid-cols-2 gap-2">
                    {allSectors.map(c => (
                      <button 
                        key={c.id} type="button" 
                        onClick={() => setFormMission({...formMission, classId: c.id})}
                        className={`flex items-center space-x-2 px-3 py-2 rounded border transition-all ${formMission.classId === c.id ? 'bg-[#D4FF00]/10 border-[#D4FF00]' : 'bg-[#1a1a1a] border-[#262626] opacity-50'}`}
                      >
                        <span className="text-sm" style={{ color: c.color }}>{c.icon}</span>
                        <span className="text-[9px] font-bold uppercase tracking-tighter">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#555] tracking-widest">Ação Operacional (Nome)</label>
                <input 
                  type="text" value={formMission.name} onChange={e => setFormMission({...formMission, name: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3 focus:border-[#D4FF00] outline-none text-sm"
                  placeholder="Ex: Teoria de Cálculo, Treino de Perna..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[10px] uppercase font-bold text-[#555] tracking-widest">Modalidade</label>
                   <select 
                     value={formMission.type} onChange={e => setFormMission({...formMission, type: e.target.value as HabitType})}
                     className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3 appearance-none outline-none text-xs"
                   >
                     <option value={HabitType.CHECKLIST}>Checklist Tático</option>
                     <option value={HabitType.TIMER}>Timer de Foco</option>
                   </select>
                </div>
                {formMission.type === HabitType.TIMER && (
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-[#555] tracking-widest">Janela de Tempo (Min)</label>
                    <input type="number" value={formMission.targetMinutes} onChange={e => setFormMission({...formMission, targetMinutes: parseInt(e.target.value)})} className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3 outline-none text-sm" />
                  </div>
                )}
              </div>

              {/* Advanced Frequency Selector */}
              <div className="space-y-4 p-4 bg-black/40 rounded-xl border border-[#262626]">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] uppercase font-bold text-[#555] tracking-widest flex items-center gap-2">
                    <Repeat size={12} /> Escala Repetitiva
                  </label>
                  <div className="flex bg-[#1a1a1a] p-1 rounded-lg border border-[#333]">
                    <button 
                      type="button" 
                      onClick={() => setFormMission({...formMission, frequencyType: 'once'})}
                      className={`px-3 py-1 text-[8px] font-bold uppercase rounded transition-colors ${formMission.frequencyType === 'once' ? 'bg-[#D4FF00] text-black' : 'text-[#555]'}`}
                    >
                      Única
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormMission({...formMission, frequencyType: 'weekly', frequencyDays: []})}
                      className={`px-3 py-1 text-[8px] font-bold uppercase rounded transition-colors ${formMission.frequencyType === 'weekly' ? 'bg-[#D4FF00] text-black' : 'text-[#555]'}`}
                    >
                      Semanal
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setFormMission({...formMission, frequencyType: 'monthly', frequencyDays: []})}
                      className={`px-3 py-1 text-[8px] font-bold uppercase rounded transition-colors ${formMission.frequencyType === 'monthly' ? 'bg-[#D4FF00] text-black' : 'text-[#555]'}`}
                    >
                      Mensal
                    </button>
                  </div>
                </div>

                {formMission.frequencyType === 'once' ? (
                  <div className="space-y-3 p-3 bg-[#1a1a1a] rounded border border-[#333]">
                     <label className="text-[9px] uppercase font-bold text-[#555] tracking-widest flex items-center gap-2">
                        <CalendarDays size={12} /> Selecionar Data da Operação
                     </label>
                     <input 
                        type="date" 
                        value={formMission.onceDate}
                        onChange={e => setFormMission({...formMission, onceDate: e.target.value})}
                        className="w-full bg-black border border-[#262626] rounded px-3 py-2 text-xs text-[#D4FF00] outline-none focus:border-[#D4FF00] transition-colors"
                     />
                     <p className="text-[8px] text-[#555] uppercase font-bold text-center">A missão aparecerá apenas na data selecionada</p>
                  </div>
                ) : formMission.frequencyType === 'weekly' ? (
                  <div className="flex justify-between gap-1">
                    {DAY_OPTIONS.map(d => (
                      <button 
                        key={d.value} type="button" 
                        onClick={() => handleToggleFreqDay(d.value)} 
                        className={`flex-1 h-10 rounded text-[10px] font-bold border transition-all ${formMission.frequencyDays.includes(d.value) ? 'bg-[#D4FF00] border-[#D4FF00] text-black shadow-[0_0_10px_#D4FF0044]' : 'bg-[#1a1a1a] border-[#262626] text-[#555]'}`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1 max-h-40 overflow-y-auto pr-1">
                    {Array.from({length: 31}).map((_, i) => (
                      <button 
                        key={i} type="button" 
                        onClick={() => handleToggleFreqDay(i + 1)}
                        className={`h-8 rounded text-[9px] font-bold border flex items-center justify-center transition-all ${formMission.frequencyDays.includes(i + 1) ? 'bg-[#D4FF00] border-[#D4FF00] text-black' : 'bg-[#1a1a1a] border-[#262626] text-[#555]'}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sub-items */}
              <div className="space-y-3 p-4 bg-black/20 rounded-xl border border-[#262626]">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] uppercase font-bold text-[#555] tracking-widest flex items-center gap-2">
                    <CheckCircle2 size={12} /> Protocolo de Itens (Checklist)
                  </label>
                  {formMission.type === HabitType.TIMER && <span className="text-[8px] font-bold text-[#D4FF00] uppercase">Integrado ao Timer</span>}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" value={newSubItem} onChange={e => setNewSubItem(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSubItem())}
                    className="flex-1 bg-black/40 border border-[#262626] rounded px-3 py-2 text-xs outline-none focus:border-[#D4FF00]"
                    placeholder="Adicionar sub-item operacional..."
                  />
                  <button type="button" onClick={addSubItem} className="bg-[#333] px-3 rounded hover:bg-[#444] text-[#D4FF00] transition-colors"><Plus size={16}/></button>
                </div>
                
                {formMission.type === HabitType.CHECKLIST && formMission.subItems.length === 0 && (
                  <div className="flex items-center gap-2 p-3 bg-[#FF4D00]/10 border border-[#FF4D00]/30 rounded-lg text-[#FF4D00] text-[9px] font-bold uppercase animate-pulse">
                    <AlertOctagon size={14} /> Requisito Operacional: Mínimo 1 item no checklist
                  </div>
                )}

                <div className="max-h-32 overflow-y-auto space-y-1 custom-scroll">
                  {formMission.subItems.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] p-2 bg-white/5 rounded border border-[#262626] hover:border-[#333]">
                      <span>{item}</span>
                      <button type="button" onClick={() => removeSubItem(i)} className="text-[#FF4D00] hover:scale-110 transition-transform"><X size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  type="submit" 
                  disabled={isChecklistInvalid}
                  className={`w-full py-4 flex items-center justify-center gap-2 font-bold uppercase tracking-[0.3em] rounded-lg transition-all ${isChecklistInvalid ? 'bg-[#1a1a1a] text-[#444] border border-[#333] cursor-not-allowed' : 'bg-[#D4FF00] text-black shadow-[0_0_20px_#D4FF0044] hover:opacity-90 active:scale-95'}`}
                >
                  {isChecklistInvalid ? <Lock size={16} /> : null}
                  {editingMissionId ? 'Atualizar Protocolo' : 'Mobilizar Missão'}
                </button>

                {editingMissionId && (
                  <button 
                    type="button" 
                    onClick={() => handleDeleteMission(editingMissionId)}
                    className="w-full py-3 flex items-center justify-center gap-2 text-[#FF4D00] border border-[#FF4D00]/30 bg-[#FF4D00]/5 hover:bg-[#FF4D00]/10 font-bold uppercase text-[10px] tracking-[0.2em] rounded-lg transition-all"
                  >
                    <Trash2 size={14} /> ABORTAR OPERAÇÃO PERMANENTEMENTE
                  </button>
                )}

                {isChecklistInvalid && <p className="text-center text-[8px] text-[#555] uppercase font-bold">Adicione ao menos um item ao checklist para desbloquear</p>}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Creation Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
           <div className="bg-[#121212] w-full max-w-md border border-[#262626] rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-[#262626] flex justify-between items-center bg-[#1a1a1a]">
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-[#D4FF00]">Registrar Novo Setor</h3>
              <button onClick={() => setShowClassModal(false)} className="text-[#555] hover:text-white"><X size={20}/></button>
            </div>
            <form onSubmit={handleCreateClass} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#555] tracking-widest">Identificação Nominal</label>
                <input 
                  autoFocus type="text" value={formClass.name} onChange={e => setFormClass({...formClass, name: e.target.value})}
                  className="w-full bg-[#1a1a1a] border border-[#262626] rounded-lg px-4 py-3 focus:border-[#D4FF00] outline-none text-sm"
                  placeholder="Ex: Treino, Carreira, Logística..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#555] tracking-widest">Símbolo Operacional</label>
                <div className="grid grid-cols-5 gap-2 p-3 bg-black/20 rounded-lg border border-[#262626]">
                   {TACTICAL_EMOJIS.map(emoji => (
                     <button 
                       key={emoji} type="button" onClick={() => setFormClass({...formClass, icon: emoji})}
                       className={`text-xl p-2 rounded transition-all ${formClass.icon === emoji ? 'bg-[#D4FF00] scale-110 shadow-[0_0_10px_#D4FF0044]' : 'hover:bg-white/5 opacity-60'}`}
                     >
                       {emoji}
                     </button>
                   ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#555] tracking-widest">Matriz de Cor</label>
                <div className="grid grid-cols-5 gap-2 p-3 bg-black/20 rounded-lg border border-[#262626]">
                   {TACTICAL_COLORS.map(c => (
                     <button 
                       key={c} type="button" onClick={() => setFormClass({...formClass, color: c})}
                       className={`h-8 rounded border-2 transition-all ${formClass.color === c ? 'border-white scale-110' : 'border-transparent opacity-60'}`}
                       style={{ backgroundColor: c }}
                     />
                   ))}
                </div>
              </div>

              <button type="submit" className="w-full py-4 bg-[#D4FF00] text-black font-bold uppercase tracking-widest rounded-lg shadow-[0_0_20px_#D4FF0044] transition-all">Validar Setor</button>
            </form>
           </div>
        </div>
      )}

      {/* Mobile Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-[#121212]/95 backdrop-blur-xl border-t border-[#262626] flex items-center justify-around px-6 z-50">
        <MobileNavItem icon={<LayoutDashboard size={20}/>} active={activeTab === 'hoje'} onClick={() => setActiveTab('hoje')} />
        <MobileNavItem icon={<Target size={20}/>} active={activeTab === 'habitos'} onClick={() => setActiveTab('habitos')} />
        <button onClick={() => { setEditingMissionId(null); setShowAddModal(true); }} className="w-14 h-14 bg-[#D4FF00] rounded-full flex items-center justify-center -mt-8 shadow-[0_0_20px_#D4FF0066] transition-transform active:scale-90"><Plus className="text-black" size={28}/></button>
        <MobileNavItem icon={<ChartIcon size={20}/>} active={activeTab === 'estatisticas'} onClick={() => setActiveTab('estatisticas')} />
        <MobileNavItem icon={<Package size={20}/>} active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} />
      </nav>
    </div>
  );
};

const MissionFreqBadge = ({ mission }: { mission: Mission }) => {
  if (mission.frequency.type === 'once') {
    const dateStr = mission.frequency.days[0] as string;
    const formatted = format(parseISO(dateStr), "dd 'de' MMM", { locale: ptBR });
    return <span>ÚNICA ({formatted})</span>;
  }
  return <span>{mission.frequency.type.toUpperCase()}</span>;
};

interface MissionCardProps {
  mission: Mission;
  color: string;
  isCompleted: boolean;
  onComplete: (intensity: number, duration?: number, completedItems?: string[]) => void;
  onEdit: () => void;
  onDelete: () => void;
}

const MissionCard: React.FC<MissionCardProps> = ({ mission, color, isCompleted, onComplete, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [showTimer, setShowTimer] = useState(false);
  const todayStr = vaultService.getTodayString();
  const completedSubItems = mission.completedDays[todayStr]?.completedItems || [];

  const toggleSubItem = (itemId: string) => {
    const newItems = completedSubItems.includes(itemId)
      ? completedSubItems.filter((id: string) => id !== itemId)
      : [...completedSubItems, itemId];
    
    let intensity = 100;
    if (mission.subItems?.length) {
      intensity = Math.round((newItems.length / mission.subItems.length) * 100);
    }
    
    onComplete(intensity, undefined, newItems);
  };

  const isFullyDone = mission.type === HabitType.CHECKLIST 
    ? (mission.subItems?.length ? completedSubItems.length === mission.subItems.length : isCompleted)
    : isCompleted;

  const getFreqLabel = () => {
    if (mission.frequency.type === 'weekly') {
      const active = DAY_OPTIONS.filter(d => mission.frequency.days.includes(d.value)).map(d => d.label);
      return active.length === 7 ? 'Diário' : active.join(' • ');
    } else if (mission.frequency.type === 'once') {
      return 'OP. ÚNICA';
    }
    return `Dias: ${mission.frequency.days.join(', ')}`;
  };

  return (
    <div className={`bg-[#121212] rounded-2xl border transition-all duration-300 ${isFullyDone ? 'border-[#D4FF00]/20 opacity-60 scale-[0.98]' : 'border-[#262626] hover:border-[#333]'}`}>
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4 cursor-pointer flex-1" onClick={() => setExpanded(!expanded)}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-500 ${isFullyDone ? 'bg-[#D4FF00] text-black shadow-[0_0_15px_#D4FF00]' : 'bg-[#1a1a1a]'}`}>
             {isFullyDone ? <CheckCircle2 size={24}/> : (mission.icon || '🎯')}
          </div>
          <div>
            <h4 className={`font-bold text-[11px] transition-colors uppercase tracking-widest ${isFullyDone ? 'text-[#555] line-through' : 'text-white'}`}>{mission.name}</h4>
            <div className="flex items-center space-x-2 mt-1">
               <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded" style={{ backgroundColor: color + '22', color: color }}>
                 {mission.type}
               </span>
               <span className="text-[8px] font-bold text-[#555] uppercase tracking-tighter">{getFreqLabel()}</span>
               {mission.subItems?.length > 0 && (
                 <span className="text-[8px] font-bold text-[#D4FF00]/60 uppercase">Checklist {completedSubItems.length}/{mission.subItems.length}</span>
               )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {mission.type === HabitType.TIMER && !isFullyDone && (
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowTimer(!showTimer); }} 
              className={`p-2 bg-[#1a1a1a] border border-[#333] rounded-lg transition-all ${showTimer ? 'bg-[#D4FF00] text-black scale-110 shadow-[0_0_10px_#D4FF0044]' : 'text-[#D4FF00] hover:border-[#D4FF00]'}`}
            >
              <Clock size={18}/>
            </button>
          )}
          <button type="button" onClick={() => setExpanded(!expanded)} className={`p-2 transition-transform duration-300 ${expanded ? 'rotate-180 text-[#D4FF00]' : 'text-[#555]'}`}>{expanded ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</button>
        </div>
      </div>

      {expanded && (
        <div className="p-4 bg-black/20 border-t border-[#262626] space-y-4 animate-in slide-in-from-top duration-300">
           {mission.subItems && mission.subItems.length > 0 && (
             <div className="space-y-2">
               {mission.subItems.map((item: any) => (
                 <div 
                   key={item.id} 
                   onClick={(e) => { e.stopPropagation(); toggleSubItem(item.id); }} 
                   className="group flex items-center space-x-3 p-3 bg-[#1a1a1a]/50 rounded-lg cursor-pointer border border-transparent hover:border-[#333] transition-all"
                 >
                    <div className={`w-4 h-4 rounded-[3px] border-2 flex items-center justify-center transition-all duration-300 ${completedSubItems.includes(item.id) ? 'bg-[#D4FF00] border-[#D4FF00] text-black' : 'border-[#333] group-hover:border-[#555]'}`}>
                       {completedSubItems.includes(item.id) && <CheckCircle2 size={10}/>}
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-tight transition-colors ${completedSubItems.includes(item.id) ? 'text-[#555] line-through' : 'text-white'}`}>{item.text}</span>
                 </div>
               ))}
             </div>
           )}

           <div className="flex justify-end items-center space-x-4 pt-2 border-t border-[#262626]/50">
              <button 
                type="button"
                onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  onEdit(); 
                }} 
                className="flex items-center space-x-2 text-[9px] font-bold uppercase tracking-widest text-[#555] hover:text-[#D4FF00] transition-colors"
              >
                <Pencil size={12} /> <span>Editar Missão</span>
              </button>
              <button 
                type="button"
                onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation(); 
                  onDelete(); 
                }} 
                className="flex items-center space-x-2 text-[9px] font-bold uppercase tracking-widest text-[#555] hover:text-[#FF4D00] transition-colors"
              >
                <Trash2 size={12} /> <span>Abortar Operação</span>
              </button>
           </div>
        </div>
      )}

      {showTimer && mission.targetTime && (
        <div className="p-4 bg-[#0d0d0d] border-t border-[#262626] animate-in slide-in-from-bottom duration-300">
           <Timer title={mission.name} initialTime={mission.targetTime} onComplete={(dur) => { onComplete(100, dur); setShowTimer(false); }} />
        </div>
      )}
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`w-full flex items-center space-x-4 px-4 py-3 rounded-lg transition-all ${active ? 'bg-[#D4FF00] text-black font-bold shadow-[0_0_10px_#D4FF0022]' : 'text-[#888] hover:text-white hover:bg-white/5'}`}>
    {icon} <span className="text-[10px] uppercase tracking-widest font-bold">{label}</span>
  </button>
);

const MobileNavItem = ({ icon, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 transition-colors ${active ? 'text-[#D4FF00]' : 'text-[#555]'}`}>
    {icon}
  </button>
);

export default App;
