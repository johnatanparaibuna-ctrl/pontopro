
import React, { useState } from 'react';
import { Punch, Employee, PunchType, AbsenceRecord, EntryMethod, EntryModality, LocationConfig } from '../types';

interface HistoryViewProps {
  punches: Punch[];
  employees: Employee[];
  records: AbsenceRecord[];
  locationConfig: LocationConfig;
  onSyncDay: (empId: string, date: string, newPunches: Punch[], newRecord?: AbsenceRecord) => void;
  onEditRecord: (record: AbsenceRecord) => void;
  onDeletePunch: (punchId: string) => void;
  onDeleteRecord: (recordId: string) => void;
  onDeleteAllPunches: () => void;
  onDeleteAllRecords: () => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ 
  punches, employees, records, 
  onSyncDay, onEditRecord, onDeleteRecord,
  onDeleteAllPunches, onDeleteAllRecords
}) => {
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'DETAILED' | 'VACATIONS'>('SUMMARY');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAllHistory, setShowAllHistory] = useState(false);
  
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pendingAction, setPendingAction] = useState<{ fn: () => void } | null>(null);

  const [isEditDayModalOpen, setIsEditDayModalOpen] = useState(false);
  const [isManualAddModalOpen, setIsManualAddModalOpen] = useState(false);
  const [isEditVacationModalOpen, setIsEditVacationModalOpen] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  
  const [editDayData, setEditDayData] = useState<{ 
    emp: Employee, 
    date: string, 
    e1: string, s1: string, e2: string, s2: string, 
    notes: string 
  } | null>(null);

  const [editVacationData, setEditVacationData] = useState<AbsenceRecord | null>(null);
  const [dayToDelete, setDayToDelete] = useState<{ empId: string, date: string } | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const requestAuth = (action: () => void) => {
    setPendingAction({ fn: action });
    setIsPinModalOpen(true);
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinValue === '2303') {
      setIsPinModalOpen(false);
      const actionToRun = pendingAction?.fn;
      setPinValue('');
      setPendingAction(null);
      if (actionToRun) actionToRun();
    } else {
      alert('PIN Administrador Incorreto!');
      setPinValue('');
    }
  };

  const openEditDay = (emp: Employee, date: string) => {
    const dayPunches = punches.filter(p => p.employeeId === emp.id && p.timestamp.startsWith(date)).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const getT = (idx: number) => {
      if (!dayPunches[idx]) return '';
      const d = new Date(dayPunches[idx].timestamp);
      return d.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit', timeZone: 'UTC'});
    };
    setEditDayData({
      emp, date, e1: getT(0), s1: getT(1), e2: getT(2), s2: getT(3),
      notes: Array.from(new Set(dayPunches.map(p => p.notes).filter(Boolean))).join(' | ')
    });
    setIsEditDayModalOpen(true);
  };

  const openEditVacation = (record: AbsenceRecord) => {
    setEditVacationData(record);
    setIsEditVacationModalOpen(true);
  };

  const handleEditVacationSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editVacationData) return;
    const fd = new FormData(e.currentTarget);
    onEditRecord({
      ...editVacationData,
      date: fd.get('date') as string,
      endDate: fd.get('endDate') as string,
      reason: fd.get('reason') as string
    });
    setIsEditVacationModalOpen(false);
    setEditVacationData(null);
  };

  const handleEditDaySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editDayData) return;
    const fd = new FormData(e.currentTarget);
    const times = [fd.get('e1'), fd.get('s1'), fd.get('e2'), fd.get('s2')].map(v => v as string);
    const notes = fd.get('notes') as string;
    const type = fd.get('type') as AbsenceRecord['type'];

    const newPunches: Punch[] = [];
    times.forEach((t, i) => {
      if (t && t.trim() !== "") {
        newPunches.push({
          id: Math.random().toString(36).substr(2, 9),
          employeeId: editDayData.emp.id,
          type: i % 2 === 0 ? PunchType.IN : PunchType.OUT,
          timestamp: `${editDayData.date}T${t}:00.000Z`,
          entryMethod: EntryMethod.MANUAL,
          modality: EntryModality.PIN,
          notes
        });
      }
    });

    const newRecord: AbsenceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId: editDayData.emp.id,
      date: editDayData.date,
      type: type === 'DONE' ? 'DONE' : type,
      reason: notes || 'Sincronização Master'
    };

    onSyncDay(editDayData.emp.id, editDayData.date, newPunches, type === 'DONE' ? undefined : newRecord);
    setIsEditDayModalOpen(false);
    setEditDayData(null);
  };

  const handleManualAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const empId = fd.get('employeeId') as string;
    const date = fd.get('date') as string;
    const times = [fd.get('e1'), fd.get('s1'), fd.get('e2'), fd.get('s2')].map(v => v as string);
    const notes = fd.get('notes') as string;

    const newPunches: Punch[] = [];
    times.forEach((t, i) => {
      if (t && t.trim() !== "") {
        newPunches.push({
          id: Math.random().toString(36).substr(2, 9),
          employeeId: empId,
          type: i % 2 === 0 ? PunchType.IN : PunchType.OUT,
          timestamp: `${date}T${t}:00.000Z`,
          entryMethod: EntryMethod.MANUAL,
          modality: EntryModality.PIN,
          notes
        });
      }
    });

    onSyncDay(empId, date, newPunches);
    setIsManualAddModalOpen(false);
  };

  const getStatusInfo = (dayRecord: AbsenceRecord | undefined, dateStr: string, punchCount: number) => {
    const isPast = dateStr < todayStr;
    if (dayRecord) {
      switch(dayRecord.type) {
        case 'VACATION': return { label: '🌴 FÉRIAS', color: 'text-amber-600 bg-amber-50 border-amber-100', key: 'VACATION' };
        case 'ABSENCE': return { label: '⚠️ FALTA', color: 'text-rose-600 bg-rose-50 border-rose-100', key: 'ABSENCE' };
        case 'DONE': return { label: '✅ CONCLUÍDO', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', key: 'DONE' };
        case 'REST': return { label: '🏠 DESCANSO', color: 'text-slate-400 bg-slate-50 border-slate-100', key: 'REST' };
        default: return { label: '✅ CONCLUÍDO', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', key: 'DONE' };
      }
    }
    if (punchCount === 0) {
      return isPast 
        ? { label: '⚠️ FALTA', color: 'text-rose-600 bg-rose-50 border-rose-100', key: 'ABSENCE' }
        : { label: '🕒 AUSENTE', color: 'text-slate-400 bg-slate-50 border-slate-100', key: 'ABSENCE' };
    }
    if (punchCount % 2 !== 0) return { label: '⏳ EM CURSO', color: 'text-amber-600 bg-amber-50 border-amber-100', key: 'INCOMPLETE' };
    return { label: '✅ CONCLUÍDO', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', key: 'DONE' };
  };

  const renderPunchLine = (empPunches: Punch[]) => {
    const sorted = [...empPunches].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {[0, 1, 2, 3].map(i => {
          const p = sorted[i];
          if (!p) return <div key={i} className="w-[60px] h-[32px] border border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-300">--:--</div>;
          const time = new Date(p.timestamp).toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit', timeZone: 'UTC'});
          const label = p.type === PunchType.IN ? 'E' : 'S';
          return (
            <div key={p.id} className={`w-[60px] h-[32px] rounded-lg flex items-center justify-center text-[10px] font-black border-2 ${p.type === PunchType.IN ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}>
              <span className="opacity-40 mr-0.5">{label}{Math.ceil((i+1)/2)}:</span>{time}
            </div>
          );
        })}
      </div>
    );
  };

  const getConsolidatedRows = (filterDate: string, all: boolean, currentStatusFilter: string) => {
    const data: any[] = [];
    employees.forEach(emp => {
      let dates: string[] = all ? Array.from(new Set<string>(punches.filter(p => p.employeeId === emp.id).map(p => p.timestamp.split('T')[0]))).sort().reverse() : [filterDate];
      if (all && !dates.includes(todayStr)) dates.unshift(todayStr);
      dates.forEach((d: string) => {
        const dayPunches = punches.filter(p => p.employeeId === emp.id && p.timestamp.startsWith(d));
        const dayRecord = records.find(r => r.employeeId === emp.id && (d === r.date || (r.endDate && d >= r.date && d <= r.endDate)));
        const status = getStatusInfo(dayRecord, d, dayPunches.length);
        const notes = Array.from(new Set(dayPunches.map(p => p.notes).filter(Boolean))).join(' | ');
        if ((!searchTerm || emp.name.toLowerCase().includes(searchTerm.toLowerCase())) && (currentStatusFilter === 'ALL' || status.key === currentStatusFilter)) {
          data.push({ emp, date: d, dayPunches, status, notes });
        }
      });
    });
    return data;
  };

  const currentRows = getConsolidatedRows(startDate, showAllHistory, statusFilter);
  const vacationRecords = records.filter(r => r.type === 'VACATION').filter(r => {
    const emp = employees.find(e => e.id === r.employeeId);
    return !searchTerm || (emp && emp.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <header className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white italic leading-none">Arquivo Master</h2>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1">Registos de Assiduidade e Férias</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => requestAuth(() => setIsManualAddModalOpen(true))} className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-indigo-500 transition-all">
            Novo Registo
          </button>
          <button onClick={() => requestAuth(() => setShowClearHistoryModal(true))} className="bg-rose-50 text-rose-600 px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-rose-600 hover:text-white transition-all">
            Limpar Tudo
          </button>
        </div>
      </header>

      <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-[1.5rem] w-fit shadow-md border border-slate-100 dark:border-white/5 mx-auto">
        <button onClick={() => { setActiveTab('SUMMARY'); setStatusFilter('ALL'); setShowAllHistory(false); }} className={`px-6 py-3 rounded-[1rem] text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'SUMMARY' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Resumo Diário</button>
        <button onClick={() => { setActiveTab('DETAILED'); setStatusFilter('ALL'); }} className={`px-6 py-3 rounded-[1rem] text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'DETAILED' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Histórico</button>
        <button onClick={() => setActiveTab('VACATIONS')} className={`px-6 py-3 rounded-[1rem] text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'VACATIONS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>Férias</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-lg items-end">
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Colaborador</label>
          <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500 shadow-inner" />
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Estado</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500 shadow-inner">
            <option value="ALL">TODOS</option>
            <option value="DONE">✅ CONCLUÍDO</option>
            <option value="INCOMPLETE">⏳ EM CURSO</option>
            <option value="ABSENCE">⚠️ FALTAS</option>
            <option value="REST">🏠 DESCANSO</option>
            <option value="VACATION">🌴 FÉRIAS</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
          <input type="date" value={startDate} disabled={showAllHistory} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500 shadow-inner disabled:opacity-30" />
        </div>
        {activeTab === 'DETAILED' && (
          <button onClick={() => setShowAllHistory(!showAllHistory)} className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${showAllHistory ? 'bg-indigo-600 text-white border-indigo-600' : 'text-indigo-600 border-indigo-600'}`}>
            {showAllHistory ? 'Ver Data Única' : 'Ver Tudo'}
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-xl border border-slate-100 dark:border-white/5 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="bg-slate-50 dark:bg-slate-800/30 text-slate-400 text-[8px] font-black uppercase tracking-[0.2em]">
              <tr>
                <th className="px-8 py-5">Data</th>
                <th className="px-8 py-5">Colaborador</th>
                <th className="px-8 py-5 text-center">Registos Master (E/S)</th>
                <th className="px-8 py-5 text-center">Observações</th>
                <th className="px-8 py-5 text-center">Estado</th>
                <th className="px-8 py-5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeTab !== 'VACATIONS' && currentRows.map((row, idx) => (
                <tr key={`${row.emp.id}-${row.date}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all h-20">
                  <td className="px-8 py-1 font-mono text-[10px] text-slate-400 font-bold">{row.date}</td>
                  <td className="px-8 py-1 font-black uppercase text-[10px] text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{row.emp.name}</td>
                  <td className="px-8 py-1 text-center min-w-[280px]">{renderPunchLine(row.dayPunches)}</td>
                  <td className="px-8 py-1 text-center truncate max-w-[150px] text-[9px] font-bold text-slate-400">{row.notes || '--'}</td>
                  <td className="px-8 py-1">
                    <span className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border block w-fit mx-auto shadow-sm ${row.status.color}`}>
                      {row.status.label}
                    </span>
                  </td>
                  <td className="px-8 py-1 text-right">
                    {activeTab !== 'SUMMARY' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => requestAuth(() => openEditDay(row.emp, row.date))} className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white rounded-lg text-indigo-600 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => requestAuth(() => setDayToDelete({ empId: row.emp.id, date: row.date }))} className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-600 hover:text-white rounded-lg text-rose-500 transition-all">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {activeTab === 'VACATIONS' && vacationRecords.map(r => {
                const emp = employees.find(e => e.id === r.employeeId);
                return (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-all h-20">
                    <td className="px-8 py-1 font-mono text-[10px] font-black text-amber-600">{r.date}{r.endDate ? ` → ${r.endDate}` : ''}</td>
                    <td className="px-8 py-1 font-black uppercase text-[10px] text-slate-700 dark:text-slate-200">{emp?.name || '---'}</td>
                    <td className="px-8 py-1 text-center text-[9px] text-slate-300 italic uppercase font-black">FÉRIAS REGISTADAS</td>
                    <td className="px-8 py-1 text-center truncate max-w-[150px] text-[9px] font-bold text-slate-400">{r.reason || '--'}</td>
                    <td className="px-8 py-1">
                      <span className="px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border text-amber-600 bg-amber-50 border-amber-100 block w-fit mx-auto shadow-sm">🌴 FÉRIAS</span>
                    </td>
                    <td className="px-8 py-1 text-right">
                       <div className="flex justify-end gap-2">
                         <button onClick={() => requestAuth(() => openEditVacation(r))} className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white rounded-lg text-indigo-600 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                         </button>
                         <button onClick={() => requestAuth(() => onDeleteRecord(r.id))} className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-600 hover:text-white rounded-lg text-rose-500 transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         </button>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Add Modal */}
      {isManualAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl max-w-lg w-full p-8 animate-slide-up border dark:border-white/5">
            <h3 className="text-xl font-black uppercase mb-6 text-slate-900 dark:text-white italic text-center">Registo Master</h3>
            <form onSubmit={handleManualAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Colaborador</label>
                  <select name="employeeId" required className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] font-bold dark:text-white outline-none border border-transparent focus:border-indigo-600">
                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                  <input type="date" name="date" required defaultValue={startDate} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] font-bold dark:text-white border border-transparent focus:border-indigo-600 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['e1', 's1', 'e2', 's2'].map(field => (
                  <div key={field} className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.toUpperCase()}</label>
                    <input type="time" name={field} className="w-full px-2 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] font-bold dark:text-white border border-transparent focus:border-indigo-600 outline-none shadow-inner" />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações</label>
                <textarea name="notes" placeholder="Descreva as ocorrências..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] font-bold dark:text-white h-20 resize-none outline-none border border-transparent focus:border-indigo-600 shadow-inner" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsManualAddModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Day Modal */}
      {isEditDayModalOpen && editDayData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl max-w-lg w-full p-8 animate-slide-up border dark:border-white/5">
            <h3 className="text-xl font-black uppercase mb-2 text-slate-900 dark:text-white italic text-center">Editar Dia Master</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">{editDayData.emp.name} | {editDayData.date}</p>
            <form onSubmit={handleEditDaySubmit} className="space-y-6">
              <div className="grid grid-cols-4 gap-2">
                {['e1', 's1', 'e2', 's2'].map(field => (
                  <div key={field} className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.toUpperCase()}</label>
                    <input type="time" name={field} defaultValue={(editDayData as any)[field]} className="w-full px-2 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] font-bold dark:text-white border border-transparent focus:border-indigo-600 outline-none shadow-inner" />
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Sobrepor Estado</label>
                <select name="type" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] font-bold dark:text-white outline-none border border-transparent focus:border-indigo-600 shadow-inner">
                  <option value="DONE">Manter Picagens</option>
                  <option value="ABSENCE">Marcar Falta</option>
                  <option value="VACATION">Marcar Férias</option>
                  <option value="REST">Folga / Descanso</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações</label>
                <textarea name="notes" defaultValue={editDayData.notes} placeholder="Notas de auditoria..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] font-bold dark:text-white h-20 resize-none outline-none border border-transparent focus:border-indigo-600 shadow-inner" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditDayModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400">Descartar</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Sincronizar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vacation Modal */}
      {isEditVacationModalOpen && editVacationData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl max-w-lg w-full p-8 animate-slide-up border dark:border-white/5">
            <h3 className="text-xl font-black uppercase mb-6 text-slate-900 dark:text-white italic text-center">Editar Férias</h3>
            <form onSubmit={handleEditVacationSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                  <input type="date" name="date" required defaultValue={editVacationData.date} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] font-bold dark:text-white outline-none border border-transparent focus:border-indigo-600" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Fim</label>
                  <input type="date" name="endDate" required defaultValue={editVacationData.endDate} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] font-bold dark:text-white outline-none border border-transparent focus:border-indigo-600" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações</label>
                <textarea name="reason" defaultValue={editVacationData.reason} placeholder="Motivo das férias..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-[11px] font-bold dark:text-white h-24 resize-none outline-none border border-transparent focus:border-indigo-600 shadow-inner" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsEditVacationModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400">Voltar</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear History Modal */}
      {showClearHistoryModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[250] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl max-w-sm w-full p-10 text-center border dark:border-white/5 animate-slide-up">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-4 italic">Limpar Histórico?</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">Deseja apagar todos os registos de ponto e ausências do sistema?</p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { onDeleteAllPunches(); onDeleteAllRecords(); setShowClearHistoryModal(false); }} className="w-full bg-rose-600 text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg">Confirmar Limpeza Total</button>
              <button onClick={() => setShowClearHistoryModal(false)} className="w-full py-4 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Day) */}
      {dayToDelete && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[250] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl max-w-sm w-full p-10 text-center border dark:border-white/5 animate-slide-up">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-4 italic">Apagar Registos?</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-8">Remover permanentemente as picagens de {dayToDelete.date}?</p>
            <div className="flex gap-4">
              <button onClick={() => setDayToDelete(null)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400">Voltar</button>
              <button onClick={() => { onSyncDay(dayToDelete.empId, dayToDelete.date, []); setDayToDelete(null); }} className="flex-[2] bg-rose-600 text-white py-4 rounded-xl text-[10px] font-black uppercase shadow-lg">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Auth Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[300] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-sm p-12 text-center border dark:border-white/5 animate-slide-up">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic mb-8">Acesso Admin</h3>
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <input type="password" value={pinValue} onChange={e => setPinValue(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" className="w-full bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl text-center text-5xl font-mono tracking-[0.5em] outline-none border-2 border-transparent focus:border-indigo-600 dark:text-white shadow-inner" autoFocus />
              <div className="flex gap-4">
                <button type="button" onClick={() => setIsPinModalOpen(false)} className="flex-1 text-[11px] font-black uppercase text-slate-400 py-4">Voltar</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-black text-xs uppercase shadow-xl hover:bg-indigo-700 transition-all">Validar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryView;
