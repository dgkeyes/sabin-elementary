import type { Question, Subject } from './types';

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

/** Builds four unique numeric choices around the right answer. */
function numeric(q: string, right: number, near: number[], explain?: string): Question {
  const set = new Set<number>([right]);
  for (const n of near) if (set.size < 4 && n !== right && n >= 0) set.add(n);
  for (let k = 1; set.size < 4; k++) set.add(right + k * 7);
  return { q, choices: [...set].map(String), answer: 0, explain };
}

export const math: Subject = {
  id: 'math',
  name: 'Math',
  teacher: 'Ms. Rivera',
  teacherLook: 'rivera',
  mode: 'quiz',
  emoji: '➗',
  lessons: [
    {
      title: 'Multiplying big numbers',
      intro: ['Good morning, mathematicians! Today we multiply bigger numbers.', 'Break them into parts: 23 × 4 is 20 × 4 plus 3 × 4. Ready?'],
      questions: [],
      generate: () => {
        const a = ri(12, 49);
        const b = ri(3, 9);
        const r = a * b;
        return numeric(`What is ${a} × ${b}?`, r, [r + b, r - b, r + 10, (a + 1) * b], `${a} × ${b} = ${Math.floor(a / 10) * 10} × ${b} + ${a % 10} × ${b} = ${r}`);
      },
    },
    {
      title: 'Fractions',
      intro: ['Today is all about fractions!', 'To add fractions, the bottom numbers have to match first.'],
      questions: [
        { q: 'What is 1/4 + 2/4?', choices: ['3/4', '3/8', '2/4', '1/2'], answer: 0, explain: 'Same bottom number, so add the tops: 1 + 2 = 3. That is 3/4.' },
        { q: 'Which fraction is the same as 1/2?', choices: ['3/6', '2/3', '1/3', '4/6'], answer: 0, explain: '3/6 simplifies to 1/2.' },
        { q: 'What is 1/2 + 1/4?', choices: ['3/4', '2/6', '2/4', '1/6'], answer: 0, explain: '1/2 is 2/4. 2/4 + 1/4 = 3/4.' },
        { q: 'Which is bigger?', choices: ['2/3', '1/2', '1/3', '1/4'], answer: 0, explain: '2/3 is more than half, so it is the biggest.' },
        { q: 'What is 3/5 of 10?', choices: ['6', '5', '3', '8'], answer: 0, explain: '10 ÷ 5 = 2, and 2 × 3 = 6.' },
        { q: 'What is 5/6 − 2/6?', choices: ['3/6', '3/0', '7/6', '2/6'], answer: 0, explain: '5 − 2 = 3, so 3/6 (which is also 1/2).' },
        { q: 'How do you write 1 and 1/2 as a fraction?', choices: ['3/2', '1/2', '2/1', '11/2'], answer: 0, explain: '1 whole is 2/2, plus 1/2 makes 3/2.' },
      ],
    },
    {
      title: 'Decimals',
      intro: ['Decimals are just another way to write fractions.', 'The first place after the dot is tenths, the next is hundredths.'],
      questions: [
        { q: 'What is 0.5 + 0.25?', choices: ['0.75', '0.30', '0.525', '7.5'], answer: 0, explain: 'Line up the dots: 0.50 + 0.25 = 0.75.' },
        { q: 'Which number is the largest?', choices: ['0.8', '0.75', '0.09', '0.456'], answer: 0, explain: '0.8 is 8 tenths, more than 7 tenths.' },
        { q: 'What is 3.4 × 10?', choices: ['34', '3.40', '340', '0.34'], answer: 0, explain: 'Times 10 moves the digits one place left.' },
        { q: 'How is 7/10 written as a decimal?', choices: ['0.7', '7.10', '0.07', '7.0'], answer: 0, explain: 'Seven tenths is 0.7.' },
        { q: 'Round 4.68 to the nearest tenth.', choices: ['4.7', '4.6', '5.0', '4.68'], answer: 0, explain: 'The 8 rounds the 6 up to 7.' },
        { q: 'What is 2.5 − 1.2?', choices: ['1.3', '1.7', '3.7', '1.03'], answer: 0, explain: '2.5 − 1.2 = 1.3.' },
      ],
    },
    {
      title: 'Volume',
      intro: ['Today: volume! That is how much space a box takes up.', 'Volume = length × width × height, in cubic units.'],
      questions: [
        { q: 'A box is 2 by 3 by 4. What is its volume?', choices: ['24 cubic units', '9 cubic units', '20 cubic units', '12 cubic units'], answer: 0, explain: '2 × 3 × 4 = 24.' },
        { q: 'A cube has sides of 3. What is its volume?', choices: ['27', '9', '12', '18'], answer: 0, explain: '3 × 3 × 3 = 27.' },
        { q: 'Which unit measures volume?', choices: ['cubic centimeters', 'centimeters', 'square centimeters', 'grams'], answer: 0 },
        { q: 'A box is 5 long, 2 wide, 1 tall. Volume?', choices: ['10', '8', '7', '15'], answer: 0, explain: '5 × 2 × 1 = 10.' },
        { q: 'If you double the height of a box, its volume…', choices: ['doubles', 'stays the same', 'halves', 'triples'], answer: 0 },
      ],
    },
    {
      title: 'Order of operations',
      intro: ['When a problem has many steps, order matters!', 'Parentheses first, then × and ÷, then + and −.'],
      questions: [
        { q: 'What is 3 + 4 × 2?', choices: ['11', '14', '10', '9'], answer: 0, explain: 'Multiply first: 4 × 2 = 8, then 3 + 8 = 11.' },
        { q: 'What is (3 + 4) × 2?', choices: ['14', '11', '10', '24'], answer: 0, explain: 'Parentheses first: 7 × 2 = 14.' },
        { q: 'What is 20 − 6 ÷ 2?', choices: ['17', '7', '14', '13'], answer: 0, explain: 'Divide first: 6 ÷ 2 = 3, then 20 − 3 = 17.' },
        { q: 'What is 2 × (5 − 1) + 3?', choices: ['11', '12', '8', '13'], answer: 0, explain: '5 − 1 = 4, 2 × 4 = 8, 8 + 3 = 11.' },
        { q: 'What is 18 ÷ (2 + 1)?', choices: ['6', '10', '9', '3'], answer: 0, explain: '2 + 1 = 3 and 18 ÷ 3 = 6.' },
      ],
    },
  ],
};
