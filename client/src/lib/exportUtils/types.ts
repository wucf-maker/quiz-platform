/**
 * 共用型別：匯出資料結構
 */

export interface SubmissionRow {
  id: number;
  studentName: string;
  totalScore: number;
  maxScore: number;
  submittedAt: Date | string;
}

export interface QuestionStat {
  questionId: number;
  questionText: string;
  questionType: string;
  correctCount: number;
  totalCount: number;
  correctRate: number;
  wrongAnswers: { answer: unknown; count: number }[];
}

export interface ExportData {
  assessmentTitle: string;
  assessmentDescription?: string | null;
  totalSubmissions: number;
  averageScore: number;
  maxScore: number;
  submissions: SubmissionRow[];
  questionStats: QuestionStat[];
  scoreDistribution: { range: string; count: number }[];
}