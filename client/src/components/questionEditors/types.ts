/**
 * 題型編輯器共用類型
 */

export type QuestionType = "single_choice" | "picture_choice" | "matching" | "fill_blank";

export const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "單選題",
  picture_choice: "圖片選擇題",
  matching: "連線題",
  fill_blank: "填充題",
};

export const TYPE_COLORS: Record<QuestionType, string> = {
  single_choice: "#D4C5F9",
  picture_choice: "#B8F0D8",
  matching: "#FFF3A3",
  fill_blank: "#FFB3C6",
};

export interface SingleChoiceOption {
  id: string;
  text: string;
}

export interface PictureChoiceOption {
  id: string;
  text: string;
  imageKey?: string;
  imageUrl?: string;
}

export interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

export interface QuestionEditorProps {
  initialData?: any;
  onChange: (data: { options: any; correctAnswer: any }) => void;
  onValidationChange?: (valid: boolean) => void;
}