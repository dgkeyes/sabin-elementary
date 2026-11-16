import type { Subject } from './types';

export const social: Subject = {
  id: 'social',
  name: 'Social Studies',
  teacher: 'Mrs. Okafor',
  teacherLook: 'okafor',
  mode: 'quiz',
  emoji: '🌎',
  lessons: [
    {
      title: 'Maps and geography',
      intro: ['Hello, explorers! Let us look at maps today.', 'Remember: Never Eat Soggy Waffles. North, East, South, West!'],
      questions: [
        { q: 'Which is the largest ocean?', choices: ['Pacific', 'Atlantic', 'Indian', 'Arctic'], answer: 0 },
        { q: 'What do we call lines that run north to south on a globe?', choices: ['Longitude', 'Latitude', 'The equator', 'Borders'], answer: 0 },
        { q: 'How many continents are there?', choices: ['7', '5', '9', '50'], answer: 0 },
        { q: 'The map key that explains symbols is called the…', choices: ['Legend', 'Compass', 'Scale', 'Title'], answer: 0 },
        { q: 'Which continent is the United States on?', choices: ['North America', 'South America', 'Europe', 'Asia'], answer: 0 },
        { q: 'The line around the middle of Earth is the…', choices: ['Equator', 'Prime meridian', 'North Pole', 'Coastline'], answer: 0 },
      ],
    },
    {
      title: 'Government',
      intro: ['Today we learn how our government works.', 'The U.S. government has three branches that share power.'],
      questions: [
        { q: 'Which branch makes the laws?', choices: ['Legislative (Congress)', 'Executive (President)', 'Judicial (Courts)', 'The school board'], answer: 0 },
        { q: 'Who leads the executive branch?', choices: ['The President', 'The Chief Justice', 'The Speaker', 'The Mayor'], answer: 0 },
        { q: 'The highest court in the U.S. is the…', choices: ['Supreme Court', 'Traffic court', 'Food court', 'District court'], answer: 0 },
        { q: 'Why do we have three branches?', choices: ['So no group has too much power', 'To make things slow', 'Because three is lucky', 'For parades'], answer: 0, explain: 'This is called checks and balances.' },
        { q: 'The first ten amendments to the Constitution are called the…', choices: ['Bill of Rights', 'Declaration', 'Pledge', 'Anthem'], answer: 0 },
      ],
    },
    {
      title: 'Early American history',
      intro: ['Time to travel back in history!', 'In 1776 the colonies declared independence from Great Britain.'],
      questions: [
        { q: 'In what year was the Declaration of Independence signed?', choices: ['1776', '1492', '1865', '1999'], answer: 0 },
        { q: 'Who was the first U.S. President?', choices: ['George Washington', 'Abraham Lincoln', 'Thomas Edison', 'Ben Franklin'], answer: 0 },
        { q: 'How many original colonies were there?', choices: ['13', '50', '7', '10'], answer: 0 },
        { q: 'Who mainly wrote the Declaration of Independence?', choices: ['Thomas Jefferson', 'George Washington', 'Paul Revere', 'Betsy Ross'], answer: 0 },
        { q: 'People who lived in the Americas long before the colonists are called…', choices: ['Native Americans', 'Pilgrims', 'Vikings', 'Astronauts'], answer: 0 },
      ],
    },
  ],
};
