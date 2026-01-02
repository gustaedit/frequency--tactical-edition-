
import React from 'react';

interface HeatmapProps {
  data: Record<string, number>; // date -> intensity 0-100
}

const Heatmap: React.FC<HeatmapProps> = ({ data }) => {
  const today = new Date();
  const daysToShow = 210; // Approx 7 months
  const days = Array.from({ length: daysToShow }).map((_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (daysToShow - 1 - i));
    return d.toISOString().split('T')[0];
  });

  const getColor = (intensity: number) => {
    if (intensity === 0) return 'bg-[#1a1a1a]';
    if (intensity < 25) return 'bg-[#2d4000]';
    if (intensity < 50) return 'bg-[#5c8000]';
    if (intensity < 75) return 'bg-[#8ab300]';
    return 'bg-[#D4FF00] shadow-[0_0_8px_#D4FF00]';
  };

  return (
    <div className="flex flex-col space-y-2 p-4 bg-[#121212] rounded-xl border border-[#262626]">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#888]">Consistência Tática</h3>
        <div className="flex items-center space-x-1">
          <span className="text-[10px] text-[#555]">Mín</span>
          <div className="w-2 h-2 bg-[#1a1a1a] rounded-sm"></div>
          <div className="w-2 h-2 bg-[#D4FF00] rounded-sm"></div>
          <span className="text-[10px] text-[#555]">Máx</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {days.map(date => (
          <div
            key={date}
            title={`${date}: ${data[date] || 0}%`}
            className={`w-3 h-3 rounded-[1px] transition-all duration-300 ${getColor(data[date] || 0)}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-[#555] pt-2">
        <span>Jan</span>
        <span>Mar</span>
        <span>Mai</span>
        <span>Jul</span>
        <span>Set</span>
        <span>Nov</span>
      </div>
    </div>
  );
};

export default Heatmap;
