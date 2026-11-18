import { sfx } from '../core/sound';
import type { Question } from '../content/subjects';
import { h, onTap } from '../util/dom';

export interface QuizResult {
  correct: number;
  total: number;
  missed: Question[];
}

/**
 * Multiple-choice questions in a card at the bottom of the screen.
 * A wrong answer shows the right one and moves on.
 */
export function runQuiz(root: HTMLElement, title: string, questions: Question[], opts: { removeWrong?: number; onAnswer?: (right: boolean) => void } = {}): Promise<QuizResult> {
  return new Promise((resolve) => {
    const card = h('div', { class: 'panel quiz' });
    root.append(card);
    let i = 0;
    let correct = 0;
    const missed: Question[] = [];
    const next = () => {
      i++;
      if (i < questions.length) show();
      else {
        card.remove();
        resolve({ correct, total: questions.length, missed });
      }
    };
    const show = () => {
      const q = questions[i];
      card.innerHTML = '';
      const fb = h('div', { class: 'feedback' });
      const hidden = new Set<number>();
      // Lucky Pencil upgrade: cross out some wrong answers
      const wrong = q.choices.map((_, k) => k).filter((k) => k !== q.answer);
      for (let k = 0; k < Math.min(opts.removeWrong ?? 0, wrong.length - 1); k++) hidden.add(wrong[k]);
      let locked = false;
      const buttons = q.choices.map((c, k) => {
        const b = h('button', { class: 'ans', style: hidden.has(k) ? 'opacity:.25;text-decoration:line-through' : '' }, c);
        onTap(b, () => {
          if (locked || hidden.has(k)) return;
          locked = true;
          const right = k === q.answer;
          if (right) correct++;
          else missed.push(q);
          b.classList.add(right ? 'right' : 'wrong');
          buttons[q.answer].classList.add('right');
          fb.textContent = (right ? '✅ Correct! ' : '❌ Not quite. ') + (q.explain ?? (right ? '' : `The answer is ${q.choices[q.answer]}.`));
          if (right) sfx.right();
          else sfx.wrong();
          opts.onAnswer?.(right);
          setTimeout(next, right ? 1400 : 2600);
        });
        return b;
      });
      // Skip: move on without answering (counts like a wrong answer, no penalty)
      const skip = h('button', { class: 'skip-btn' }, '⏭ Skip');
      onTap(skip, () => {
        if (locked) return;
        locked = true;
        missed.push(q);
        next();
      });
      card.append(h('div', { class: 'q-head' }, h('span', null, title), h('span', { style: 'display:flex;gap:12px;align-items:center' }, `${i + 1} / ${questions.length}`, skip)), h('div', { class: 'q-text' }, q.q), h('div', { class: 'answers' }, buttons), fb);
    };
    show();
  });
}
