export interface Word {
  id: string;
  english: string;
  turkish: string;
  example_sentence: string;
  turkish_sentence: string;
  created_at?: string;
  user_id?: string;
}

export enum AppMode {
  HOME = 'HOME',
  FLASHCARDS = 'FLASHCARDS',
  QUIZ = 'QUIZ',
  SENTENCES = 'SENTENCES'
}

export enum LanguageDirection {
  EN_TR = 'EN_TR', // İngilizce -> Türkçe
  TR_EN = 'TR_EN'  // Türkçe -> İngilizce
}

export interface QuizQuestion {
  questionWord: Word;
  options: string[];
  correctAnswer: string;
}