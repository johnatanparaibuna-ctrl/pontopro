
import React, { useState, useEffect } from 'react';
import { AppView, Employee, Punch, AbsenceRecord, EmployeeStatus, PunchType, EntryMethod, EntryModality, EmailConfig, LocationConfig } from './types';
import { StorageService } from './services/storage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PunchClock from './components/PunchClock';
import EmployeeManager from './components/EmployeeManager';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('DASHBOARD');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [punches, setPunches] = useState<Punch[]>([]);
  const [records, setRecords] = useState<AbsenceRecord[]>([]);
  const [emailConfig, setEmailConfig] = useState<EmailConfig>(StorageService.getEmailConfig());
  const [locationConfig, setLocationConfig] = useState<LocationConfig>(StorageService.getLocationConfig());
  const [theme, setTheme] = useState<'light' | 'dark'>(StorageService.getTheme());

  useEffect(() => {
    setEmployees(StorageService.getEmployees());
    setPunches(StorageService.getPunches());
    setRecords(StorageService.getRecords());
  }, []);

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    StorageService.saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    const checkBackupSchedule = () => {
      if (!emailConfig.enabled || !emailConfig.targetEmail) return;
      const now = new Date();
      const [schedH, schedM] = emailConfig.scheduleTime.split(':').map(Number);
      const todayStr = now.toISOString().split('T')[0];
      if (emailConfig.lastSentDate === todayStr) return;
      if (now.getHours() > schedH || (now.getHours() === schedH && now.getMinutes() >= schedM)) {
        const updatedConfig = { ...emailConfig, lastSentDate: todayStr };
        setEmailConfig(updatedConfig);
        StorageService.saveEmailConfig(updatedConfig);
      }
    };
    const interval = setInterval(checkBackupSchedule, 60000);
    checkBackupSchedule();
    return () => clearInterval(interval);
  }, [emailConfig]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleImportData = (data: { employees: Employee[], punches: Punch[], records: AbsenceRecord[] }) => {
    setEmployees(data.employees);
    setPunches(data.punches);
    setRecords(data.records);
    StorageService.saveEmployees(data.employees);
    StorageService.savePunches(data.punches);
    StorageService.saveRecords(data.records);
  };

  const handlePunch = (code: string, options?: { 
    manualData?: { type: PunchType; timestamp: string, method?: EntryMethod }, 
    modality?: EntryModality,
    location?: { lat: number, lng: number },
    forceType?: PunchType,
    notes?: string
  }) => {
    const employee = employees.find(e => e.code === code);
    if (!employee) return { success: false, message: 'ID INCORRETO!' };
    
    if (employee.status === EmployeeStatus.VACATION) {
      return { success: false, message: `ACESSO NEGADO: ${employee.name} EM FÉRIAS.` };
    }

    const { manualData, modality = EntryModality.PIN, location, forceType, notes } = options || {};
    const method = manualData?.method || (manualData ? EntryMethod.MANUAL : EntryMethod.AUTO);
    const now = manualData ? new Date(manualData.timestamp) : new Date();
    const todayStr = now.toISOString().split('T')[0];

    const todayPunches = punches.filter(p => p.employeeId === employee.id && p.timestamp.startsWith(todayStr));
    const finalType = forceType || (manualData ? manualData.type : (todayPunches.length % 2 === 0 ? PunchType.IN : PunchType.OUT));

    const newPunch: Punch = {
      id: Math.random().toString(36).substr(2, 9),
      employeeId: employee.id,
      type: finalType,
      timestamp: now.toISOString(),
      entryMethod: method,
      modality: modality,
      location: location,
      notes: notes
    };

    setPunches(prev => {
      const updated = [...prev, newPunch];
      StorageService.savePunches(updated);
      return updated;
    });

    return { success: true, message: `${newPunch.type === 'IN' ? 'ENTRADA' : 'SAÍDA'} REGISTADA!` };
  };

  const handleSyncDay = (empId: string, date: string, newPunches: Punch[], newRecord?: AbsenceRecord) => {
    setPunches(prev => {
      const filtered = prev.filter(p => !(p.employeeId === empId && p.timestamp.startsWith(date)));
      const updated = [...filtered, ...newPunches];
      StorageService.savePunches(updated);
      return updated;
    });

    if (newRecord) {
      setRecords(prev => {
        const filtered = prev.filter(r => !(r.employeeId === empId && r.date === date));
        const updated = [...filtered, newRecord];
        StorageService.saveRecords(updated);
        return updated;
      });
    } else {
      setRecords(prev => {
        const updated = prev.filter(r => !(r.employeeId === empId && r.date === date));
        StorageService.saveRecords(updated);
        return updated;
      });
    }
  };

  const handleEditRecord = (updatedRecord: AbsenceRecord) => {
    setRecords(prev => {
      const updated = prev.map(r => r.id === updatedRecord.id ? updatedRecord : r);
      StorageService.saveRecords(updated);
      return updated;
    });
  };

  const handleUpdateStatus = (id: string, status: EmployeeStatus, vStart?: string, vEnd?: string, aDate?: string, aReason?: string) => {
    setEmployees(prev => {
      const updated = prev.map(e => {
        if (e.id !== id) return e;
        return { 
          ...e, 
          status, 
          vacationStart: status === EmployeeStatus.VACATION ? vStart : undefined, 
          vacationEnd: status === EmployeeStatus.VACATION ? vEnd : undefined
        };
      });
      StorageService.saveEmployees(updated);
      return updated;
    });

    if (status !== EmployeeStatus.ACTIVE) {
      const newRecord: AbsenceRecord = {
        id: Math.random().toString(36).substr(2, 9),
        employeeId: id,
        date: status === EmployeeStatus.VACATION ? (vStart || new Date().toISOString().split('T')[0]) : (aDate || new Date().toISOString().split('T')[0]),
        endDate: status === EmployeeStatus.VACATION ? vEnd : undefined,
        type: status === EmployeeStatus.VACATION ? 'VACATION' : 'ABSENCE',
        reason: status === EmployeeStatus.VACATION ? `FÉRIAS: ${vStart} A ${vEnd}` : aReason
      };
      setRecords(prev => {
        const updated = [...prev, newRecord];
        StorageService.saveRecords(updated);
        return updated;
      });
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      <Sidebar currentView={view} setView={setView} theme={theme} toggleTheme={toggleTheme} />
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {view === 'DASHBOARD' && <Dashboard employees={employees} punches={punches} records={records} theme={theme} />}
          {view === 'PUNCH' && <PunchClock employees={employees} punches={punches} onPunch={handlePunch} locationConfig={locationConfig} />}
          {view === 'EMPLOYEES' && <EmployeeManager 
            employees={employees} 
            records={records} 
            onAdd={(emp) => { 
              const n = {...emp, id: Math.random().toString(36).substr(2, 9)};
              setEmployees(prev => {
                const updated = [...prev, n];
                StorageService.saveEmployees(updated);
                return updated;
              });
            }} 
            onEdit={(up) => {
              setEmployees(prev => {
                const updated = prev.map(e => e.id === up.id ? up : e);
                StorageService.saveEmployees(updated);
                return updated;
              });
            }} 
            onUpdateStatus={handleUpdateStatus} 
            onDelete={(id) => {
              const updatedEmps = employees.filter(e => e.id !== id);
              setEmployees(updatedEmps); StorageService.saveEmployees(updatedEmps);
              const updatedPunches = punches.filter(p => p.employeeId !== id);
              setPunches(updatedPunches); StorageService.savePunches(updatedPunches);
              const updatedRecords = records.filter(r => r.employeeId !== id);
              setRecords(updatedRecords); StorageService.saveRecords(updatedRecords);
            }} 
          />}
          {view === 'HISTORY' && (
            <HistoryView 
              employees={employees} 
              punches={punches} 
              records={records} 
              locationConfig={locationConfig}
              onSyncDay={handleSyncDay}
              onEditRecord={handleEditRecord}
              onDeletePunch={(id) => {
                const updated = punches.filter(p => p.id !== id);
                setPunches(updated); StorageService.savePunches(updated);
              }}
              onDeleteRecord={(id) => {
                const updated = records.filter(r => r.id !== id);
                setRecords(updated); StorageService.saveRecords(updated);
              }}
              onDeleteAllPunches={() => { setPunches([]); StorageService.savePunches([]); }} 
              onDeleteAllRecords={() => { setRecords([]); StorageService.saveRecords([]); }}
            />
          )}
          {view === 'SETTINGS' && <SettingsView emailConfig={emailConfig} onSaveEmailConfig={(c) => { setEmailConfig(c); StorageService.saveEmailConfig(c); }} onImportData={handleImportData} employees={employees} punches={punches} records={records} />}
        </div>
      </main>
    </div>
  );
};

export default App;
