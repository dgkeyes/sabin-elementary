import type { Subject } from './types';

export const art: Subject = {
  id: 'art',
  name: 'Art',
  teacher: 'Mx. Lee',
  teacherLook: 'lee',
  mode: 'art',
  emoji: '🎨',
  lessons: [
    {
      title: 'Color mixing',
      intro: ['Welcome, artists! Aprons on.', 'Red, yellow, and blue are primary colors. Mix them to make new ones!'],
      questions: [
        { q: 'Red + yellow makes…', choices: ['Orange', 'Green', 'Purple', 'Brown'], answer: 0 },
        { q: 'Blue + yellow makes…', choices: ['Green', 'Orange', 'Pink', 'Gray'], answer: 0 },
        { q: 'Red + blue makes…', choices: ['Purple', 'Green', 'Orange', 'Yellow'], answer: 0 },
        { q: 'Adding white to a color makes a…', choices: ['Tint (lighter)', 'Shade (darker)', 'Primary color', 'Pattern'], answer: 0 },
        { q: 'Which is a warm color?', choices: ['Orange', 'Blue', 'Green', 'Purple'], answer: 0 },
      ],
    },
    {
      title: 'Famous artists',
      intro: ['Today we meet some famous artists.', 'Artists use line, shape, color, and texture to share ideas.'],
      questions: [
        { q: 'Who painted "The Starry Night"?', choices: ['Vincent van Gogh', 'Pablo Picasso', 'Frida Kahlo', 'Andy Warhol'], answer: 0 },
        { q: 'Frida Kahlo was an artist from…', choices: ['Mexico', 'France', 'Japan', 'Canada'], answer: 0 },
        { q: 'A picture of a person is called a…', choices: ['Portrait', 'Landscape', 'Sculpture', 'Collage'], answer: 0 },
        { q: 'Art made by gluing paper pieces together is a…', choices: ['Collage', 'Sketch', 'Mural', 'Statue'], answer: 0 },
        { q: 'A painting of mountains and fields is a…', choices: ['Landscape', 'Portrait', 'Self-portrait', 'Still life'], answer: 0 },
      ],
    },
  ],
};

export const music: Subject = {
  id: 'music',
  name: 'Music',
  teacher: 'Mr. Bell',
  teacherLook: 'bell',
  mode: 'music',
  emoji: '🎵',
  lessons: [
    {
      title: 'Rhythm',
      intro: ['Hello, musicians! Let us feel the beat.', 'A quarter note gets one beat. Clap along with me!'],
      questions: [
        { q: 'How many beats does a whole note get in 4/4 time?', choices: ['4', '1', '2', '3'], answer: 0 },
        { q: 'How many beats does a half note get?', choices: ['2', '1', '4', '½'], answer: 0 },
        { q: 'Two eighth notes equal one…', choices: ['Quarter note', 'Whole note', 'Half note', 'Rest'], answer: 0 },
        { q: 'A rest in music means…', choices: ['Be silent', 'Play loudly', 'Play faster', 'Sing high'], answer: 0 },
        { q: 'The speed of music is called the…', choices: ['Tempo', 'Pitch', 'Volume', 'Melody'], answer: 0 },
      ],
    },
    {
      title: 'Instruments',
      intro: ['Today we explore instrument families.', 'Strings, woodwinds, brass, and percussion!'],
      questions: [
        { q: 'A violin belongs to which family?', choices: ['Strings', 'Brass', 'Percussion', 'Woodwinds'], answer: 0 },
        { q: 'A drum belongs to which family?', choices: ['Percussion', 'Strings', 'Brass', 'Woodwinds'], answer: 0 },
        { q: 'A trumpet belongs to which family?', choices: ['Brass', 'Strings', 'Percussion', 'Woodwinds'], answer: 0 },
        { q: 'A flute belongs to which family?', choices: ['Woodwinds', 'Brass', 'Strings', 'Percussion'], answer: 0 },
        { q: 'How high or low a sound is, is called…', choices: ['Pitch', 'Tempo', 'Rhythm', 'Rest'], answer: 0 },
      ],
    },
  ],
};

export const pe: Subject = {
  id: 'pe',
  name: 'PE',
  teacher: 'Coach Davis',
  teacherLook: 'davis',
  mode: 'pe',
  emoji: '🤸',
  lessons: [
    {
      title: 'Healthy bodies',
      intro: ['Alright team, PE time! Let us warm up.', 'Moving every day keeps your heart and muscles strong.'],
      questions: [
        { q: 'Why do we warm up before exercising?', choices: ['To prevent injuries', 'To get tired', 'To get cold', 'No reason'], answer: 0 },
        { q: 'Which muscle pumps blood?', choices: ['Heart', 'Bicep', 'Calf', 'Tongue'], answer: 0 },
        { q: 'What should you drink when you exercise?', choices: ['Water', 'Soda', 'Nothing', 'Syrup'], answer: 0 },
        { q: 'Kids should be active about how long each day?', choices: ['60 minutes', '5 minutes', '6 hours', 'Never'], answer: 0 },
        { q: 'Good sportsmanship means…', choices: ['Playing fair and being kind', 'Always winning', 'Yelling at refs', 'Quitting'], answer: 0 },
      ],
    },
  ],
};
