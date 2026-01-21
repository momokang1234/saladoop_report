
export enum ReporterName {
  KBK = '구본록',
  MSJ = '모승준'
}

export enum ShiftStage {
  OPEN = '오픈',
  MIDDLE = '미들 타임',
  CLOSE = '마감'
}

export type BusyLevel = '한가함' | '보통' | '바쁨' | '매우 바쁨';

export interface ReportSchema {
  id: string;
  date: string;
  timestamp: string;
  reporter_name: string;
  reporter_email?: string; // 추가: 지메일 정보
  reporter_uid?: string;   // 추가: 고유 식별자
  shift_stage: string;
  has_photo: boolean;
  photos: string[];
  busy_level: BusyLevel;
  issues: string;
  checklist: Record<string, boolean>;
  summary_for_boss: string;
}

export type FormData = {
  shiftStage: ShiftStage;
  busyLevel: BusyLevel;
  issues: string;
  summaryForBoss: string;
  checklist: Record<string, boolean>;
  photos: string[];
};

export type ViewMode = 'form' | 'history' | 'management' | 'success' | 'auth';
