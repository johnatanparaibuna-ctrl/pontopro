
import React from 'react';
import { Employee, Punch, AbsenceRecord, EmployeeStatus, PunchType } from '../types';

interface DashboardProps {
  employees: Employee[];
  punches: Punch[];
  records: AbsenceRecord[];
  theme: 'light' | 'dark';
}

const Dashboard: React.FC<DashboardProps> = ({ employees, punches, records }) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const todayPunches = punches.filter(p => p.timestamp.startsWith(todayStr));
  
  const presentCount = Array.from(new Set(todayPunches.filter(p => p.type === PunchType.IN).map(p => p.employeeId))).length;
  const vacationCount = employees.filter(e => e.status === EmployeeStatus.VACATION).length;
  
  const getStatusInfo = (dayRecord: AbsenceRecord | undefined, dateStr: string, punchCount: number) => {
    const checkDate = new Date(dateStr);
    const dayOfWeek = checkDate.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isToday = dateStr === todayStr;

    if (dayRecord) {
      switch(dayRecord.type) {
        case 'VACATION': return { label: '🌴 FÉRIAS', color: 'text-amber-600 bg-amber-50 border-amber-100' };
        case 'ABSENCE': return { label: '⚠️ FALTA', color: 'text-rose-600 bg-rose-50 border-rose-100' };
        case 'REST': return { label: '🏠 DESCANSO', color: 'text-slate-400 bg-slate-50 border-slate-100' };
        default: return { label: '🚩 EVENTO', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' };
      }
    }

    if (isWeekend && punchCount === 0) return { label: '🏠 DESCANSO', color: 'text-slate-400 bg-slate-50 border-slate-100' };
    if (punchCount === 0) {
      return isToday 
        ? { label: '🕒 AUSENTE', color: 'text-slate-400 bg-slate-50 border-slate-100' }
        : { label: '⚠️ FALTA', color: 'text-rose-600 bg-rose-50 border-rose-100' };
    }
    if (punchCount % 2 !== 0) return { label: '⏳ EM CURSO', color: 'text-amber-600 bg-amber-50 border-amber-100' };
    return { label: '✅ CONCLUÍDO', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
  };

  const absentCount = employees.filter(e => {
    const hasPunches = todayPunches.some(p => p.employeeId === e.id);
    const dayRecord = records.find(r => r.employeeId === e.id && todayStr === r.date);
    const status = getStatusInfo(dayRecord, todayStr, hasPunches ? 1 : 0);
    return status.label === '⚠️ FALTA' || status.label === '🕒 AUSENTE';
  }).length;

  const renderPunchLine = (empPunches: Punch[]) => {
    const sorted = [...empPunches].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {[0, 1, 2, 3].map(i => {
          const p = sorted[i];
          if (!p) return (
            <div key={i} className="w-[60px] h-[32px] rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-300 font-bold flex items-center justify-center">
              --:--
            </div>
          );
          const time = new Date(p.timestamp).toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit', timeZone: 'UTC'});
          const label = p.type === PunchType.IN ? 'E' : 'S';
          const subIdx = Math.ceil((i + 1)/2);
          return (
            <div key={p.id} className={`flex items-center gap-1 px-1.5 h-[32px] rounded-lg text-[10px] font-black border-2 w-[60px] justify-center shadow-sm ${p.type === PunchType.IN ? 'bg-indigo-50 border-indigo-100 text-indigo-700 shadow-indigo-100/30' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
              <span className="opacity-40">{label}{subIdx}:</span>
              <span>{time}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-1 italic uppercase">Monitor Central</h2>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
            {now.toLocaleDateString('pt-PT', { weekday:'long', day:'numeric', month:'long' })}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Staff', value: employees.length, icon: '👥', color: 'text-indigo-600' },
          { label: 'Presentes', value: presentCount, icon: '⚡', color: 'text-emerald-600' },
          { label: 'Férias', value: vacationCount, icon: '🌴', color: 'text-amber-600' },
          { label: 'Alertas', value: absentCount, icon: '⚠️', color: 'text-rose-600' },
        ].map((s, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-lg hover:-translate-y-1 transition-all duration-300">
            <div className="flex justify-between items-start mb-2">
              <span className="text-2xl">{s.icon}</span>
              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 ${s.color}`}>{s.label}</span>
            </div>
            <div className="text-4xl font-black dark:text-white tracking-tighter">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/20 dark:bg-slate-900/40">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] italic">Estado Equipa</h3>
            <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase">Hoje</span>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="bg-slate-50 dark:bg-slate-800/30 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                <tr>
                  <th className="px-8 py-4">Data</th>
                  <th className="px-8 py-4">Colaborador</th>
                  <th className="px-8 py-4 text-center">Registos Master (E/S)</th>
                  <th className="px-8 py-4 text-center">Notas</th>
                  <th className="px-8 py-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map(emp => {
                  const dayPunches = todayPunches.filter(p => p.employeeId === emp.id);
                  const dayRecord = records.find(r => r.employeeId === emp.id && (todayStr === r.date || (r.endDate && todayStr >= r.date && todayStr <= r.endDate)));
                  const status = getStatusInfo(dayRecord, todayStr, dayPunches.length);
                  const notes = Array.from(new Set(dayPunches.map(p => p.notes).filter(Boolean))).join(' | ');

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all h-20">
                      <td className="px-8 py-1 font-mono text-[9px] text-slate-400 font-bold">{todayStr}</td>
                      <td className="px-8 py-1">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black shadow-inner overflow-hidden border border-slate-200 dark:border-slate-700">
                            {emp.avatar ? <img src={emp.avatar} className="w-full h-full object-cover" /> : <span className="text-slate-400 text-[10px]">{emp.name[0]}</span>}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[10px] text-slate-800 dark:text-white uppercase tracking-tight truncate">{emp.name}</p>
                            <p className="text-[8px] text-indigo-500 font-extrabold uppercase tracking-widest truncate">{emp.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-1 text-center min-w-[280px]">
                        {renderPunchLine(dayPunches)}
                      </td>
                      <td className="px-8 py-1 text-center truncate max-w-[120px] text-[8px] font-bold text-slate-400 italic">
                        {notes || '--'}
                      </td>
                      <td className="px-8 py-1 text-right">
                         <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 inline-block min-w-[120px] text-center shadow-sm ${status.color}`}>
                            {status.label}
                         </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
};

export default Dashboard;
