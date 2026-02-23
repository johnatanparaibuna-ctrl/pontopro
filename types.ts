
export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  VACATION = 'VACATION',
  ABSENT = 'ABSENT'
}

export enum EntryModality {
  PIN = 'PIN',
  FACE = 'FACE'
}

export type IncidenceType = string;

export interface Employee {
  id: string;
  name: string;
  code: string;
  role: string;
  status: EmployeeStatus;
  avatar?: string;
  vacationStart?: string;
  vacationEnd?: string;
  absenceDate?: string;
  absenceReason?: string;
  dailyWorkHours?: number;
}

export enum PunchType {
  IN = 'IN',
  OUT = 'OUT'
}

export enum EntryMethod {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL'
}

export interface Punch {
  id: string;
  employeeId: string;
  type: PunchType;
  timestamp: string;
  entryMethod: EntryMethod;
  modality: EntryModality;
  notes?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface AbsenceRecord {
  id: string;
  employeeId: string;
  date: string;
  endDate?: string; 
  type: 'VACATION' | 'ABSENCE' | 'IGNORED_ABSENCE' | 'HOLIDAY' | 'HOLIDAY_NATIONAL' | 'HOLIDAY_MUNICIPAL' | 'REST' | 'PRESENT' | 'DONE';
  reason?: string;
}

export interface LocationConfig {
  enabled: boolean;
  lat: number | null;
  lng: number | null;
}

export type BackupFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface EmailConfig {
  targetEmail: string;
  scheduleTime: string;
  frequency: BackupFrequency;
  enabled: boolean;
  lastSentDate?: string; // ISO String do último envio bem sucedido
}

export type AppView = 'DASHBOARD' | 'PUNCH' | 'EMPLOYEES' | 'HISTORY' | 'SETTINGS';
