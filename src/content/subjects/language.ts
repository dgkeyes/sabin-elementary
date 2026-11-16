import type { Subject } from './types';

export const reading: Subject = {
  id: 'reading',
  name: 'Reading',
  teacher: 'Ms. Rivera',
  teacherLook: 'rivera',
  mode: 'quiz',
  emoji: '📖',
  lessons: [
    {
      title: 'Main idea',
      intro: ['Reading time! Today we find the main idea.', 'The main idea is what the whole passage is mostly about.'],
      questions: [
        {
          q: '"Bees fly from flower to flower. They carry pollen, which helps plants make seeds." What is the main idea?',
          choices: ['Bees help plants make seeds', 'Bees can fly', 'Flowers are pretty', 'Seeds are small'],
          answer: 0,
        },
        {
          q: '"Maya practiced piano every day. At the recital, she played without a mistake." What lesson does this show?',
          choices: ['Practice pays off', 'Pianos are loud', 'Recitals are long', 'Mistakes are fun'],
          answer: 0,
        },
        { q: 'A detail is…', choices: ['A small fact that supports the main idea', 'The title', 'The last word', 'A picture'], answer: 0 },
        {
          q: '"Sam grabbed his umbrella and rain boots before leaving." What can you infer?',
          choices: ['It is rainy', 'It is sunny', 'Sam is sleepy', 'Sam is at the beach'],
          answer: 0,
          explain: 'Inferring means using clues to figure something out.',
        },
        { q: 'Where would you find what a chapter is about before reading it?', choices: ['The chapter title', 'The page number', 'The back cover', 'The index'], answer: 0 },
      ],
    },
    {
      title: 'Figurative language',
      intro: ['Authors paint pictures with words.', 'A simile compares with "like" or "as". A metaphor says one thing IS another.'],
      questions: [
        { q: 'Which is a simile?', choices: ['She ran as fast as a cheetah', 'She is a cheetah', 'She ran fast', 'The cheetah ran'], answer: 0 },
        { q: '"The classroom was a zoo." This is a…', choices: ['Metaphor', 'Simile', 'Fact', 'Question'], answer: 0, explain: 'It says the classroom IS a zoo, without "like" or "as".' },
        { q: '"The wind whispered through the trees." The wind is given human actions. This is…', choices: ['Personification', 'Rhyme', 'A simile', 'A fact'], answer: 0 },
        { q: '"I have told you a million times!" is an example of…', choices: ['Hyperbole', 'A simile', 'A metaphor', 'A fact'], answer: 0, explain: 'Hyperbole is a big exaggeration.' },
        { q: '"Buzz" and "sizzle" sound like what they mean. This is…', choices: ['Onomatopoeia', 'Alliteration', 'A metaphor', 'A synonym'], answer: 0 },
      ],
    },
    {
      title: 'Story elements',
      intro: ['Every story has a setting, characters, a problem, and a solution.', 'Let us see if you can spot them!'],
      questions: [
        { q: 'The setting of a story is…', choices: ['Where and when it happens', 'Who is in it', 'The problem', 'The ending'], answer: 0 },
        { q: 'The main character is also called the…', choices: ['Protagonist', 'Narrator', 'Author', 'Setting'], answer: 0 },
        { q: 'The most exciting part of a story, the turning point, is the…', choices: ['Climax', 'Title', 'Setting', 'Glossary'], answer: 0 },
        { q: 'A story told by "I" is written in…', choices: ['First person', 'Third person', 'Second person', 'No person'], answer: 0 },
        { q: 'The theme of a story is…', choices: ['The lesson or big idea', 'The first sentence', 'The cover color', 'The author\'s name'], answer: 0 },
      ],
    },
  ],
};

export const writing: Subject = {
  id: 'writing',
  name: 'Writing',
  teacher: 'Ms. Rivera',
  teacherLook: 'rivera',
  mode: 'quiz',
  emoji: '✏️',
  lessons: [
    {
      title: 'Grammar check',
      intro: ['Writers, grab your pencils!', 'Today we polish sentences so readers understand us.'],
      questions: [
        { q: 'Which sentence is correct?', choices: ['They\'re going to their house over there.', 'There going to they\'re house over their.', 'Their going to there house over they\'re.', 'They\'re going to there house over their.'], answer: 0 },
        { q: 'Pick the right word: "The dog wagged ___ tail."', choices: ['its', 'it\'s', 'its\'', 'it'], answer: 0, explain: '"It\'s" means "it is". The tail belongs to the dog, so "its".' },
        { q: 'Which is a complete sentence?', choices: ['The cat slept on the rug.', 'Slept on the rug.', 'The cat on the rug.', 'On the rug sleeping.'], answer: 0 },
        { q: 'Which word is a verb?', choices: ['jump', 'happy', 'table', 'quickly'], answer: 0 },
        { q: 'Which word is an adjective?', choices: ['shiny', 'run', 'slowly', 'they'], answer: 0 },
        { q: 'Where does the comma go? "After lunch we played tag."', choices: ['After lunch, we played tag.', 'After, lunch we played tag.', 'After lunch we, played tag.', 'No comma ever'], answer: 0 },
      ],
    },
    {
      title: 'Writing a great paragraph',
      intro: ['A great paragraph is like a hamburger.', 'Topic sentence on top, details in the middle, and a closing sentence at the bottom!'],
      questions: [
        { q: 'The first sentence that tells what the paragraph is about is the…', choices: ['Topic sentence', 'Closing sentence', 'Title', 'Detail'], answer: 0 },
        { q: 'Which is the best transition word to add another reason?', choices: ['Also', 'However', 'Finally', 'Once upon a time'], answer: 0 },
        { q: 'Which detail best supports "Dogs make great pets"?', choices: ['Dogs are loyal and love to play', 'Cats are fluffy', 'The sky is blue', 'I had cereal today'], answer: 0 },
        { q: 'An opinion piece tries to…', choices: ['Convince the reader', 'Tell a made-up story', 'List groceries', 'Rhyme'], answer: 0 },
        { q: 'Which word starts a closing sentence well?', choices: ['In conclusion', 'First', 'Next', 'Because'], answer: 0 },
      ],
    },
    {
      title: 'Spelling and word parts',
      intro: ['Today we look at prefixes and suffixes.', 'A prefix goes in front of a word, a suffix goes at the end.'],
      questions: [
        { q: 'What does the prefix "un-" mean in "unhappy"?', choices: ['not', 'again', 'before', 'very'], answer: 0 },
        { q: 'What does "re-" mean in "rewrite"?', choices: ['again', 'not', 'under', 'after'], answer: 0 },
        { q: 'Which is spelled correctly?', choices: ['because', 'becuase', 'becaus', 'beacause'], answer: 0 },
        { q: 'The suffix "-less" in "fearless" means…', choices: ['without', 'full of', 'again', 'more'], answer: 0 },
        { q: 'Which word is a synonym for "big"?', choices: ['large', 'tiny', 'fast', 'quiet'], answer: 0 },
        { q: 'Which word is an antonym of "cold"?', choices: ['hot', 'chilly', 'icy', 'cool'], answer: 0 },
      ],
    },
  ],
};
