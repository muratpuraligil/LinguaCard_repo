
export interface Word {
  id: string;
  english: string;
  turkish: string;
  example_sentence: string;
  turkish_sentence: string;
  created_at?: string;
  user_id?: string;
  set_name?: string; 
  is_archived?: boolean; // Yeni alan
}

export enum AppMode {
  HOME = 'HOME',
  FLASHCARDS = 'FLASHCARDS',
  QUIZ = 'QUIZ',
  SENTENCES = 'SENTENCES',
  CUSTOM_SETS = 'CUSTOM_SETS',
  CUSTOM_SET_STUDY = 'CUSTOM_SET_STUDY',
  ARCHIVE = 'ARCHIVE' // Yeni mod
}

export enum LanguageDirection {
  EN_TR = 'EN_TR',
  TR_EN = 'TR_EN'
}

export interface QuizQuestion {
  questionWord: Word;
  options: string[];
  correctAnswer: string;
}

export type OcrStatus = 'IDLE' | 'PREPARING' | 'CONNECTING' | 'ANALYZING';
