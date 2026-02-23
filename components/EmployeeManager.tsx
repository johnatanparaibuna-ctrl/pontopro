
import React, { useState, useRef } from 'react';
import { Employee, EmployeeStatus, AbsenceRecord } from '../types';

interface EmployeeManagerProps {
  employees: Employee[];
  records: AbsenceRecord[];
  onAdd: (emp: Omit<Employee, 'id'>) => void;
  onEdit: (emp: Employee) => void;
  onUpdateStatus: (id: string, status: EmployeeStatus, vStart?: string, vEnd?: string, aDate?: string, aReason?: string) => void;
  onDelete: (id: string) => void;
}

const EmployeeManager: React.FC<EmployeeManagerProps> = ({ employees, onAdd, onEdit, onUpdateStatus, onDelete }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [statusType, setStatusType] = useState<EmployeeStatus>(EmployeeStatus.VACATION);
  const [statusDates, setStatusDates] = useState({ start: '', end: '', reason: '' });

  const [formData, setFormData] = useState<Omit<Employee, 'id'> & { id?: string }>({ 
    name: '', role: '', code: '', status: EmployeeStatus.ACTIVE, avatar: '', dailyWorkHours: 8
  });

  const avatarUploadRef = useRef<HTMLInputElement>(null);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '2303') {
      setIsAuthenticated(true);
      setPinInput('');
    } else {
      alert('Código PIN de Administrador Incorreto!');
      setPinInput('');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, avatar: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode && formData.id) onEdit(formData as Employee);
    else onAdd(formData);
    setIsModalOpen(false);
    setFormData({ name: '', role: '', code: '', status: EmployeeStatus.ACTIVE, avatar: '', dailyWorkHours: 8 });
  };

  const handleOpenStatus = (emp: Employee, type: EmployeeStatus) => {
    setSelectedEmp(emp);
    setStatusType(type);
    const today = new Date().toISOString().split('T')[0];
    setStatusDates({ 
      start: today, 
      end: type === EmployeeStatus.VACATION ? new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0] : today, 
      reason: '' 
    });
    setIsStatusModalOpen(true);
  };

  const handleSaveStatus = () => {
    if (selectedEmp) {
      onUpdateStatus(selectedEmp.id, statusType, statusDates.start, statusDates.end, statusDates.start, statusDates.reason);
      setIsStatusModalOpen(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-fade-in">
        <form onSubmit={handleAuth} className="glass p-10 rounded-[2.5rem] shadow-2xl text-center space-y-6 w-full max-w-sm border border-slate-100 dark:border-white/5">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl text-white">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-xl font-black uppercase text-slate-800 dark:text-white tracking-tight">Gestão Segura</h2>
          <input 
            type="password" 
            value={pinInput} 
            onChange={e => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))} 
            placeholder="PIN ADMIN" 
            className="w-full bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl text-center text-3xl font-mono tracking-[0.4em] outline-none border-2 border-transparent focus:border-indigo-600 transition-all dark:text-white" 
            autoFocus 
          />
          <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all">Validar</button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Colaboradores</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{employees.length} Ativos</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl text-xs font-bold outline-none border border-transparent focus:border-indigo-500 transition-all dark:text-white"
            />
            <svg className="w-4 h-4 absolute left-3.5 top-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <button 
            onClick={() => { setFormData({ name: '', role: '', code: '', status: EmployeeStatus.ACTIVE, avatar: '', dailyWorkHours: 8 }); setIsEditMode(false); setIsModalOpen(true); }} 
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            Novo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {employees.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase())).map(emp => (
          <div key={emp.id} className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 shadow-xl border border-slate-100 dark:border-white/5 flex flex-col h-64 hover:-translate-y-1 transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-white/5 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-inner">
                  {emp.avatar ? (
                    <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-black text-indigo-300">{emp.name[0]}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900 dark:text-white uppercase text-xs truncate tracking-tight">{emp.name}</h3>
                  <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest truncate">{emp.role}</p>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${
                emp.status === EmployeeStatus.ACTIVE ? 'bg-emerald-50 text-emerald-600' : 
                emp.status === EmployeeStatus.VACATION ? 'bg-amber-50 text-amber-600' : 
                'bg-rose-50 text-rose-600'
              }`}>
                {emp.status === EmployeeStatus.ACTIVE ? 'Ativo' : 
                 emp.status === EmployeeStatus.VACATION ? 'Férias' : 'Falta'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-auto">
              <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">CÓDIGO PIN</p>
                <p className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono tracking-[0.2em]">{emp.code}</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl">
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">CARGA</p>
                <p className="text-xs font-black text-slate-800 dark:text-slate-100">{emp.dailyWorkHours}H/DIA</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {emp.status === EmployeeStatus.ACTIVE ? (
                <>
                  <button 
                    onClick={() => handleOpenStatus(emp, EmployeeStatus.VACATION)}
                    className="flex-1 bg-amber-50 text-amber-600 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-100 transition-colors"
                  >
                    Férias
                  </button>
                  <button 
                    onClick={() => handleOpenStatus(emp, EmployeeStatus.ABSENT)}
                    className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
                  >
                    Falta
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => onUpdateStatus(emp.id, EmployeeStatus.ACTIVE)}
                  className="flex-1 bg-emerald-50 text-emerald-600 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                >
                  Ativar
                </button>
              )}
              <button 
                onClick={() => { setFormData(emp); setIsEditMode(true); setIsModalOpen(true); }}
                className="flex-1 bg-indigo-50 text-indigo-600 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
              >
                Editar
              </button>
              <button 
                onClick={() => setConfirmDeleteId(emp.id)}
                className="px-4 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-sm p-10 text-center animate-slide-up border dark:border-white/5">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic mb-2">Eliminar?</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-8">Esta ação é irreversível.</p>
            <div className="flex gap-4">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400">Voltar</button>
              <button onClick={() => { onDelete(confirmDeleteId); setConfirmDeleteId(null); }} className="flex-[2] bg-rose-600 text-white py-4 rounded-xl text-[10px] font-black uppercase">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-slide-up border dark:border-white/5">
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic mb-8 text-center">{isEditMode ? 'Editar Perfil' : 'Novo Staff'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-slate-950 border flex items-center justify-center cursor-pointer overflow-hidden shadow-inner group relative" onClick={() => avatarUploadRef.current?.click()}>
                  {formData.avatar ? <img src={formData.avatar} className="w-full h-full object-cover" /> : <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                </div>
                <input type="file" ref={avatarUploadRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </div>
              <div className="space-y-4">
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 px-5 py-4 rounded-xl text-xs font-bold dark:text-white outline-none border border-transparent focus:border-indigo-600" placeholder="Nome" />
                <input type="text" required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 px-5 py-4 rounded-xl text-xs font-bold dark:text-white outline-none border border-transparent focus:border-indigo-600" placeholder="Cargo" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" maxLength={4} required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.replace(/\D/g, '')})} className="w-full bg-slate-50 dark:bg-slate-950 px-5 py-4 rounded-xl text-center font-mono text-xl font-black dark:text-white outline-none border border-transparent focus:border-indigo-600" placeholder="PIN" />
                  <input type="number" required value={formData.dailyWorkHours} onChange={e => setFormData({...formData, dailyWorkHours: Number(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-950 px-5 py-4 rounded-xl text-center text-xs font-black dark:text-white outline-none" placeholder="H/Dia" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400">Voltar</button>
                <button type="submit" className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStatusModalOpen && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-sm p-10 animate-slide-up border dark:border-white/5">
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase italic mb-8 text-center">
              {statusType === EmployeeStatus.VACATION ? 'Agendar Férias' : 'Registar Falta'}
            </h3>
            <div className="space-y-6">
              <div className={`grid ${statusType === EmployeeStatus.VACATION ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                  <input type="date" value={statusDates.start} onChange={e => setStatusDates({...statusDates, start: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 px-4 py-4 rounded-xl text-xs font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500" />
                </div>
                {statusType === EmployeeStatus.VACATION && (
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Fim</label>
                    <input type="date" value={statusDates.end} onChange={e => setStatusDates({...statusDates, end: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 px-4 py-4 rounded-xl text-xs font-bold dark:text-white outline-none border border-transparent focus:border-indigo-500" />
                  </div>
                )}
              </div>
              <textarea value={statusDates.reason} onChange={e => setStatusDates({...statusDates, reason: e.target.value})} placeholder="Motivo..." className="w-full bg-slate-50 dark:bg-slate-950 px-5 py-4 rounded-xl text-xs font-bold h-24 dark:text-white outline-none resize-none" />
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsStatusModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400">Voltar</button>
                <button onClick={handleSaveStatus} className={`flex-[2] text-white py-4 rounded-xl text-[10px] font-black uppercase ${statusType === EmployeeStatus.VACATION ? 'bg-amber-600' : 'bg-rose-600'}`}>Concluir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManager;
