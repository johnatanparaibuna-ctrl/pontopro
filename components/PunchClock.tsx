
import React, { useState, useRef, useEffect } from 'react';
import { PunchType, EntryModality, Employee, LocationConfig, Punch } from '../types';

interface PunchClockProps {
  employees: Employee[];
  punches: Punch[];
  locationConfig: LocationConfig;
  onPunch: (code: string, options?: { 
    manualData?: { type: PunchType; timestamp: string }, 
    modality?: EntryModality,
    location?: { lat: number, lng: number },
    forceType?: PunchType,
    notes?: string
  }) => { success: boolean; message: string; employeeName?: string; type?: string };
}

const PunchClock: React.FC<PunchClockProps> = ({ onPunch, locationConfig, employees, punches }) => {
  const [code, setCode] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string; hasGPS?: boolean }>({ type: null, message: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [identifiedEmployee, setIdentifiedEmployee] = useState<Employee | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (code.length === 4) {
      const emp = employees.find(e => e.code === code);
      setIdentifiedEmployee(emp || null);
    } else {
      setIdentifiedEmployee(null);
    }
  }, [code, employees]);

  const getNextAutoType = () => {
    if (!identifiedEmployee) return { type: PunchType.IN, label: '1ª Entrada' };
    const today = new Date().toISOString().split('T')[0];
    const todayPunches = punches.filter(p => p.employeeId === identifiedEmployee.id && p.timestamp.startsWith(today));
    
    if (todayPunches.length === 0) return { type: PunchType.IN, label: '1ª Entrada' };
    if (todayPunches.length === 1) return { type: PunchType.OUT, label: '1ª Saída' };
    if (todayPunches.length === 2) return { type: PunchType.IN, label: '2ª Entrada' };
    if (todayPunches.length === 3) return { type: PunchType.OUT, label: '2ª Saída' };
    return null; 
  };

  const executePunch = (locationData?: { lat: number, lng: number }) => {
    const finalLocation = locationData || (locationConfig.lat && locationConfig.lng ? { lat: locationConfig.lat, lng: locationConfig.lng } : undefined);
    const next = getNextAutoType();

    if (next === null) {
      setStatus({ type: 'error', message: 'Limite diário atingido.' });
      resetForm();
      return;
    }

    const result = onPunch(code, { modality: EntryModality.PIN, location: finalLocation, forceType: next.type, notes });

    if (result.success) {
      setStatus({ type: 'success', message: `${next.label.toUpperCase()} REGISTADA!`, hasGPS: !!finalLocation });
      resetForm();
    } else {
      setStatus({ type: 'error', message: result.message.toUpperCase() });
      setIsProcessing(false);
    }
    
    setTimeout(() => setStatus({ type: null, message: '' }), 6000);
  };

  const resetForm = () => {
    setCode('');
    setNotes('');
    setIdentifiedEmployee(null);
    setIsProcessing(false);
    inputRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length < 4 || isProcessing) return;
    setIsProcessing(true);
    if (!navigator.geolocation) { executePunch(); return; }
    setStatus({ type: 'info', message: 'VALIDANDO LOCALIZAÇÃO...' });
    navigator.geolocation.getCurrentPosition(
      (position) => executePunch({ lat: position.coords.latitude, lng: position.coords.longitude }),
      () => executePunch(),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const next = identifiedEmployee ? getNextAutoType() : null;

  return (
    <div className="max-w-md mx-auto py-4 px-4 animate-slide-up">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden min-h-[640px] flex flex-col">
        <div className="bg-slate-950 h-60 flex flex-col items-center justify-center relative">
          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
          
          {identifiedEmployee ? (
            <div className="animate-fade-in text-center flex flex-col items-center">
              <div className="w-24 h-24 rounded-[2.5rem] p-1 bg-white/5 border border-white/10 relative shadow-2xl">
                <div className="w-full h-full rounded-[2.2rem] overflow-hidden bg-slate-800 flex items-center justify-center">
                  {identifiedEmployee.avatar ? (
                    <img src={identifiedEmployee.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-indigo-500">{identifiedEmployee.name[0]}</span>
                  )}
                </div>
                {next && (
                  <div className={`absolute -bottom-1 -right-1 w-8 h-8 rounded-full border-4 border-slate-950 flex items-center justify-center shadow-lg ${next.type === PunchType.IN ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d={next.type === PunchType.IN ? "M5 13l4 4L19 7" : "M17 16l4-4m0 0l-4-4m4 4H7"} /></svg>
                  </div>
                )}
              </div>
              <h3 className="text-white text-lg font-black mt-4 uppercase tracking-tighter italic">{identifiedEmployee.name}</h3>
              <p className={`text-[9px] font-black uppercase tracking-[0.3em] mt-1 ${next?.type === PunchType.IN ? 'text-emerald-400' : 'text-rose-400'}`}>
                {next ? `PRÓXIMA: ${next.label}` : 'LIMITE DIÁRIO ATINGIDO'}
              </p>
            </div>
          ) : (
            <div className="opacity-10 text-center flex flex-col items-center">
              <div className="w-20 h-20 rounded-[2rem] border-4 border-white/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              </div>
              <p className="text-white text-[10px] font-black uppercase tracking-[0.6em] mt-5">SISTEMA MASTER</p>
            </div>
          )}
        </div>

        <div className="flex-1 p-10 flex flex-col justify-center space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">CÓDIGO MASTER PIN</label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              className="w-full bg-slate-50 dark:bg-slate-950 border-4 border-slate-100 dark:border-slate-800 rounded-[2.5rem] py-6 text-5xl text-center dark:text-white font-mono tracking-[0.5em] focus:border-indigo-600 outline-none transition-all shadow-inner"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">NOTAS (OPCIONAL)</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Notas de serviço..."
              className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-3xl px-6 py-4 dark:text-white text-[10px] font-bold resize-none h-20 outline-none focus:border-indigo-500 shadow-inner"
            />
          </div>

          <button
            onClick={() => handleSubmit()}
            disabled={code.length < 4 || isProcessing || (next === null && !!identifiedEmployee)}
            className={`w-full py-6 rounded-[2.5rem] text-white font-black text-xs uppercase tracking-[0.4em] transition-all shadow-2xl active:scale-95 ${
              code.length < 4 || isProcessing || (next === null && !!identifiedEmployee)
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 cursor-not-allowed shadow-none' 
                : next?.type === PunchType.OUT ? 'bg-rose-600 shadow-rose-600/30 hover:bg-rose-500' : 'bg-indigo-600 shadow-indigo-600/30 hover:bg-indigo-500'
            }`}
          >
            {isProcessing ? 'A PROCESSAR...' : next ? next.label : 'BLOQUEADO'}
          </button>
        </div>

        <div className="h-24 flex items-center justify-center px-8 pb-4">
          {status.type && (
            <div className={`w-full px-6 py-4 rounded-2xl border-2 flex items-center justify-between gap-3 animate-slide-up ${
              status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
              status.type === 'info' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
              'bg-rose-50 text-rose-700 border-rose-100'
            }`}>
               <span className="text-[9px] font-black tracking-widest uppercase">{status.message}</span>
               {status.hasGPS && <span className="bg-emerald-600 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">GPS FIX</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PunchClock;
