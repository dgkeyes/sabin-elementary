import type { Subject } from './types';

export const science: Subject = {
  id: 'science',
  name: 'Science',
  teacher: 'Mr. Patel',
  teacherLook: 'patel',
  mode: 'quiz',
  emoji: '🔬',
  lessons: [
    {
      title: 'States of matter',
      intro: ['Welcome to the lab, scientists! Goggles on.', 'Everything is made of matter: solid, liquid, or gas. Let us test what you know!'],
      questions: [
        { q: 'Which one is a gas?', choices: ['Steam', 'Ice', 'Milk', 'A rock'], answer: 0, explain: 'Steam is water as a gas.' },
        { q: 'What happens to ice when it melts?', choices: ['It becomes a liquid', 'It becomes a gas', 'It gets heavier', 'It turns into salt'], answer: 0 },
        { q: 'When water vapor cools and turns to drops, it is called…', choices: ['Condensation', 'Evaporation', 'Melting', 'Freezing'], answer: 0, explain: 'Like drops on a cold glass of lemonade.' },
        { q: 'Which keeps its own shape?', choices: ['A solid', 'A liquid', 'A gas', 'None of them'], answer: 0 },
        { q: 'Mixing salt into water makes a…', choices: ['Solution', 'Solid', 'Gas', 'Magnet'], answer: 0, explain: 'The salt dissolves, making a solution.' },
        { q: 'If you weigh ice, then melt it, the water weighs…', choices: ['The same', 'More', 'Less', 'Nothing'], answer: 0, explain: 'Matter is not lost when it changes state.' },
      ],
    },
    {
      title: 'Ecosystems and food webs',
      intro: ['Today we explore ecosystems.', 'Energy flows from the sun, to plants, to the animals that eat them.'],
      questions: [
        { q: 'Where do plants get their energy?', choices: ['The sun', 'The soil', 'Rain', 'Animals'], answer: 0, explain: 'Plants make food from sunlight. That is photosynthesis.' },
        { q: 'A rabbit eats grass. The rabbit is a…', choices: ['Consumer', 'Producer', 'Decomposer', 'Plant'], answer: 0 },
        { q: 'Mushrooms that break down dead logs are…', choices: ['Decomposers', 'Producers', 'Predators', 'Herbivores'], answer: 0 },
        { q: 'What gas do plants take in from the air?', choices: ['Carbon dioxide', 'Oxygen', 'Helium', 'Steam'], answer: 0 },
        { q: 'In grass → rabbit → fox, which is the predator?', choices: ['Fox', 'Rabbit', 'Grass', 'All of them'], answer: 0 },
        { q: 'If all the rabbits disappeared, the foxes would…', choices: ['Have less food', 'Have more food', 'Eat grass', 'Not notice'], answer: 0 },
      ],
    },
    {
      title: 'Earth and space',
      intro: ['Let us blast off into space today!', 'Earth spins once a day and goes around the sun once a year.'],
      questions: [
        { q: 'Why do we have day and night?', choices: ['Earth spins', 'The sun moves around Earth', 'The moon blocks the sun', 'Clouds'], answer: 0 },
        { q: 'How long does Earth take to orbit the sun?', choices: ['About 365 days', 'One day', 'One month', '10 years'], answer: 0 },
        { q: 'What pulls things down toward Earth?', choices: ['Gravity', 'Magnets', 'Wind', 'Light'], answer: 0 },
        { q: 'The sun looks bigger than other stars because it is…', choices: ['Closer', 'Hotter', 'Younger', 'Square'], answer: 0, explain: 'The sun is a star, just much closer to us.' },
        { q: 'Shadows are longest at…', choices: ['Morning and evening', 'Noon', 'Midnight', 'They never change'], answer: 0, explain: 'The sun is low in the sky then.' },
        { q: 'Which planet do we live on?', choices: ['Earth', 'Mars', 'Venus', 'Jupiter'], answer: 0 },
      ],
    },
    {
      title: 'Water cycle',
      intro: ['Water is always on the move!', 'It evaporates, forms clouds, and falls back down as rain or snow.'],
      questions: [
        { q: 'Rain, snow, and hail are called…', choices: ['Precipitation', 'Evaporation', 'Condensation', 'Erosion'], answer: 0 },
        { q: 'What makes water evaporate from a lake?', choices: ['Heat from the sun', 'Fish', 'Wind only', 'Cold'], answer: 0 },
        { q: 'Clouds are made of…', choices: ['Tiny water drops', 'Cotton', 'Smoke', 'Air only'], answer: 0 },
        { q: 'Most of Earth\'s water is in…', choices: ['The oceans', 'Lakes', 'Rivers', 'Clouds'], answer: 0 },
        { q: 'Water that soaks into the ground is called…', choices: ['Groundwater', 'Sky water', 'Saltwater', 'Steam'], answer: 0 },
      ],
    },
  ],
};
