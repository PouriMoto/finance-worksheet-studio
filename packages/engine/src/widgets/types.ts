import type { Answer } from '../store.ts';

export interface WidgetProps<S> {
  scene: S;
  locale: string;
  saved?: Answer;
  onAnswer: (answer: Answer, xp: number) => void;
  onContinue: (goto?: string) => void;
}
