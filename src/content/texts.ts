/** Text messages with Mom and Dad on your watch. To add a quick message, add it to QUICK_TEXTS and a rule below. */

export type Parent = 'mom' | 'dad';

/** Ready-made messages you can send with one tap. */
export const QUICK_TEXTS = [
  'On my way home! 🏠',
  'Practice was fun! ⚽',
  "What's for dinner? 🍽️",
  'Can I go to Starbucks? ☕',
  'I finished my homework! 📝',
  'Love you! ❤️',
];

export interface TextContext {
  name: string;
  /** Minutes after midnight. */
  time: number;
  dinner: string;
  dinnerTime: number;
  practiceDone: boolean;
  homeworkDone: boolean;
}

const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];

/** What a parent texts back. Rules are checked in order; the first keyword match wins. */
export function parentReply(who: Parent, text: string, c: TextContext): string {
  const t = text.toLowerCase();
  const sweet = who === 'mom' ? 'sweetie' : 'kiddo';
  const late = c.time >= 20 * 60;
  const rules: [RegExp, () => string][] = [
    [/\blove\b|❤/, () => pick([`Love you too, ${c.name}! ❤️`, 'Love you more! 🥰', `Love you, ${sweet}! 💕`])],
    [/\b(dinner|hungry|eat|food)\b/, () => (c.time < c.dinnerTime ? `We're having ${c.dinner} tonight! Dinner is at 4:00. 😋` : `${c.dinner[0].toUpperCase() + c.dinner.slice(1)}! It's ready, come sit down. 🍽️`)],
    [/starbucks|coffee|drink|cafe/, () => (late ? "It's getting late. Maybe tomorrow! 🌙" : c.time < c.dinnerTime ? 'Sure! Just be home by dinner at 4:00. ☕' : 'Okay, a quick one! Come right home after. ☕')],
    [/homework/, () => (c.homeworkDone ? 'So proud of you! 🌟' : "Nice! Don't forget to actually do it at your desk 😉")],
    [/practice|soccer|goal/, () => (c.practiceDone ? pick(["Awesome! Tell me everything at dinner! ⚽", 'Way to go! What did Coach Davis say?']) : "Have fun at practice! Listen to Coach Davis. ⚽")],
    [/way home|coming home|omw|home/, () => pick([`Great, see you soon, ${sweet}! Look both ways on Maple Street. 🚸`, 'Yay! Snacks are on the counter. 🍎'])],
    [/pick me up|ride/, () => "It's a nice day, walk home with a friend! I'll see you soon. 🚶"],
    [/sad|bad day|mad|upset/, () => `Oh no! Big hug, ${sweet}. We can talk about it when you get home. 🤗`],
    [/\b(hi|hello|hey)\b/, () => pick([`Hi ${c.name}! How was school? 😊`, `Hey ${sweet}! 👋`])],
    [/\?$/, () => pick(["Hmm, let's talk about it when you get home!", 'Good question! Ask me at dinner. 😊'])],
  ];
  for (const [re, reply] of rules) if (re.test(t)) return reply();
  return pick(['👍 Got it!', `Okay ${sweet}! 😊`, 'Sounds good! 💬']);
}
