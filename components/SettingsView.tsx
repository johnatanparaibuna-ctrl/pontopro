
import React, { useState, useMemo } from 'react';
import { EmailConfig, Employee, Punch, LocationConfig, AbsenceRecord, PunchType } from '../types';
import { StorageService } from '../services/storage';

interface SettingsViewProps {
  emailConfig: EmailConfig;
  onSaveEmailConfig: (config: EmailConfig) => void;
  onImportData: (data: { employees: Employee[], punches: Punch[], records: AbsenceRecord[] }) => void;
  employees: Employee[];
  punches: Punch[];
  records: AbsenceRecord[];
}

type ReportType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

const SettingsView: React.FC<SettingsViewProps> = ({ emailConfig, onSaveEmailConfig, onImportData, employees, punches, records }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [localEmailConfig, setLocalEmailConfig] = useState<EmailConfig>(emailConfig);
  const [localLocationConfig, setLocalLocationConfig] = useState<LocationConfig>(StorageService.getLocationConfig());
  
  const [reportType, setReportType] = useState<ReportType>('MONTH');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportYear, setReportYear] = useState(new Date().getFullYear().toString());

  const [isSaved, setIsSaved] = useState(false);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '2303') {
      setIsAuthenticated(true);
      setPinInput('');
    } else {
      alert('PIN Incorreto!');
      setPinInput('');
    }
  };

  const handleSave = () => {
    onSaveEmailConfig(localEmailConfig);
    StorageService.saveLocationConfig(localLocationConfig);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const formatH = (h: number) => {
    const totalMinutes = Math.round(h * 60);
    const hours = Math.floor(Math.abs(totalMinutes) / 60);
    const minutes = Math.abs(totalMinutes) % 60;
    const sign = h < 0 ? '-' : '';
    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const reportRange = useMemo(() => {
    let start = '';
    let end = '';
    
    if (reportType === 'DAY') {
      start = reportDate;
      end = reportDate;
    } else if (reportType === 'WEEK') {
      const d = new Date(reportDate);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      start = monday.toISOString().split('T')[0];
      end = sunday.toISOString().split('T')[0];
    } else if (reportType === 'MONTH') {
      const [y, m] = reportMonth.split('-').map(Number);
      start = `${y}-${m.toString().padStart(2, '0')}-01`;
      end = new Date(y, m, 0).toISOString().split('T')[0];
    } else if (reportType === 'YEAR') {
      start = `${reportYear}-01-01`;
      end = `${reportYear}-12-31`;
    }

    return { start, end };
  }, [reportType, reportDate, reportMonth, reportYear]);

  const summaryData = useMemo(() => {
    const { start, end } = reportRange;
    if (!start || !end) return [];
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    const result: any[] = [];

    employees.forEach(emp => {
      let current = new Date(startDate);
      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        const dayPunches = punches.filter(p => p.employeeId === emp.id && p.timestamp.startsWith(dateStr))
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        const ins = dayPunches.filter(p => p.type === PunchType.IN);
        const outs = dayPunches.filter(p => p.type === PunchType.OUT);
        
        const dayRecord = records.find(r => r.employeeId === emp.id && (dateStr === r.date || (r.endDate && dateStr >= r.date && dateStr <= r.endDate)));
        
        const dayOfWeek = current.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        let workedHours = 0;
        const numIntervals = Math.min(ins.length, outs.length);
        for (let i = 0; i < numIntervals; i++) {
            const diffMs = new Date(outs[i].timestamp).getTime() - new Date(ins[i].timestamp).getTime();
            if (diffMs > 0) workedHours += diffMs / (1000 * 60 * 60);
        }

        let isNonWorkDay = isWeekend || (dayRecord && (dayRecord.type === 'VACATION' || dayRecord.type === 'REST' || dayRecord.type.startsWith('HOLIDAY')));
        let target = isNonWorkDay ? 0 : (emp.dailyWorkHours || 8);
        
        let status = "PRESENTE";
        if (dayRecord) {
            switch(dayRecord.type) {
                case 'VACATION': status = "FÉRIAS"; break;
                case 'REST': status = "DESCANSO"; break;
                default: status = "AUSENTE";
            }
        } else if (dayPunches.length === 0 && !isWeekend) status = "FALTA";
        else if (dayPunches.length % 2 !== 0) status = "INCOMPLETO";
        else if (isWeekend && dayPunches.length === 0) status = "DESCANSO";

        result.push({
          date: dateStr,
          name: emp.name,
          status: status,
          entrada: ins.map(p => new Date(p.timestamp).toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit', timeZone: 'UTC'})).join(' | '),
          saida: outs.map(p => new Date(p.timestamp).toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit', timeZone: 'UTC'})).join(' | '),
          worked: workedHours,
          balance: workedHours - target
        });

        current.setDate(current.getDate() + 1);
      }
    });

    return result;
  }, [reportRange, employees, punches, records]);

  const exportToExcel = () => {
    const headers = ['Data', 'Colaborador', 'Estado', 'Entradas', 'Saídas', 'Horas', 'Saldo'];
    const rows = summaryData.map(item => [
      item.date,
      item.name,
      item.status,
      item.entrada,
      item.saida,
      formatH(item.worked),
      formatH(item.balance)
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-32">
      {!isAuthenticated ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <form onSubmit={handleAuth} className="bg-white dark:bg-slate-900 p-12 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-white/5 text-center space-y-6 w-full max-w-sm">
            <h2 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tighter italic">Painel Admin</h2>
            <input type="password" value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" className="w-full bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl text-center text-5xl font-mono outline-none border-2 border-transparent focus:border-indigo-600 dark:text-white shadow-inner" autoFocus />
            <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase shadow-xl hover:opacity-90">Entrar</button>
          </form>
        </div>
      ) : (
        <>
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic leading-none">Relatórios</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Extração e auditoria financeira</p>
            </div>
            <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all">
                Exportar CSV
            </button>
          </header>

          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Modalidade</label>
                <select value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold dark:text-white shadow-inner">
                  <option value="DAY">Diário</option>
                  <option value="WEEK">Semanal</option>
                  <option value="MONTH">Mensal</option>
                  <option value="YEAR">Anual</option>
                </select>
              </div>
              <div className="md:col-span-2 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Referência</label>
                {reportType === 'MONTH' ? (
                  <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-bold dark:text-white shadow-inner" />
                ) : reportType === 'YEAR' ? (
                  <input type="number" value={reportYear} onChange={e => setReportYear(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-bold dark:text-white shadow-inner" />
                ) : (
                  <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-bold dark:text-white shadow-inner" />
                )}
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex flex-col items-center justify-center">
                   <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Total de Linhas</p>
                   <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{summaryData.length}</p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-slate-50 dark:border-white/5 custom-scrollbar">
              <table className="w-full text-left">
                <thead className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800/50">
                  <tr><th className="p-6">Data</th><th className="p-6">Colaborador</th><th className="p-6">Estado</th><th className="p-6 text-center">Entradas</th><th className="p-6 text-center">Saídas</th><th className="p-6 text-right">Saldo</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {summaryData.slice(0, 50).map((item, idx) => (
                    <tr key={idx} className="text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="p-6 font-mono text-slate-400">{item.date}</td>
                      <td className="p-6 uppercase text-slate-700 dark:text-slate-200">{item.name}</td>
                      <td className="p-6"><span className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 text-[8px] font-black uppercase">{item.status}</span></td>
                      <td className="p-6 text-center font-mono">{item.entrada}</td>
                      <td className="p-6 text-center font-mono">{item.saida}</td>
                      <td className={`p-6 text-right font-mono font-black ${item.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{item.balance > 0 ? '+' : ''}{formatH(item.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="max-w-2xl">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6">
              <h3 className="font-black uppercase text-xs tracking-widest text-slate-800 dark:text-white italic">Configuração de Backup</h3>
              <div className="space-y-4">
                <input type="email" value={localEmailConfig.targetEmail} onChange={e => setLocalEmailConfig({...localEmailConfig, targetEmail: e.target.value})} placeholder="Email de Destino" className="w-full bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl text-xs font-bold dark:text-white outline-none border-2 border-transparent focus:border-indigo-600 transition-all shadow-inner" />
                <div className="flex items-center gap-3">
                   <input type="checkbox" checked={localEmailConfig.enabled} onChange={e => setLocalEmailConfig({...localEmailConfig, enabled: e.target.checked})} className="w-6 h-6 rounded-lg text-indigo-600" />
                   <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Backup Automático Ativo</label>
                </div>
              </div>
              <button onClick={handleSave} className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isSaved ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'}`}>
                {isSaved ? 'Configurações Guardadas' : 'Gravar Alterações'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SettingsView;
