export type ResourceCategory = 'math' | 'science' | 'language' | 'geography' | 'arts' | 'technology' | 'teacher';

export type Resource = {
  id: string;
  title: string;
  description: string;
  url: string;
  category: ResourceCategory;
  language: string;
  offline: boolean;
  free: boolean;
  format: 'video' | 'interactive' | 'printable' | 'audio' | 'article' | 'tool';
  region?: string;
};

export const RESOURCES: Resource[] = [
  // Math
  {
    id: 'khan-math',
    title: 'Khan Academy — Math',
    description: 'Free video lessons and exercises covering arithmetic, algebra, and geometry in multiple languages.',
    url: 'https://www.khanacademy.org/math',
    category: 'math', language: 'en/fr/sw', offline: false, free: true, format: 'interactive',
  },
  {
    id: 'mathigon',
    title: 'Mathigon',
    description: 'Interactive, visual mathematics textbook covering topics from fractions to calculus.',
    url: 'https://mathigon.org',
    category: 'math', language: 'en', offline: false, free: true, format: 'interactive',
  },
  {
    id: 'numberphile',
    title: 'Numberphile YouTube',
    description: 'Short, engaging videos exploring fascinating mathematical concepts for curious learners.',
    url: 'https://www.youtube.com/@numberphile',
    category: 'math', language: 'en', offline: false, free: true, format: 'video',
  },
  {
    id: 'math-worksheets-land',
    title: 'Math Worksheets Land',
    description: 'Thousands of free printable worksheets aligned to curriculum standards.',
    url: 'https://www.mathworksheetsland.com',
    category: 'math', language: 'en', offline: true, free: true, format: 'printable',
  },
  {
    id: 'desmos',
    title: 'Desmos Graphing Calculator',
    description: 'Free online graphing calculator — excellent for algebra and functions.',
    url: 'https://www.desmos.com/calculator',
    category: 'math', language: 'en', offline: false, free: true, format: 'tool',
  },

  // Science
  {
    id: 'ck12-science',
    title: 'CK-12 Science',
    description: 'Free adaptive science textbooks covering life, earth, and physical science with simulations.',
    url: 'https://www.ck12.org/student/',
    category: 'science', language: 'en', offline: false, free: true, format: 'interactive',
  },
  {
    id: 'nasa-kids',
    title: 'NASA Kids Club',
    description: 'Age-appropriate space science content and activities directly from NASA.',
    url: 'https://www.nasa.gov/kidsclub',
    category: 'science', language: 'en', offline: false, free: true, format: 'interactive',
  },
  {
    id: 'phet-simulations',
    title: 'PhET Interactive Simulations',
    description: 'University of Colorado research-based science simulations — free, downloadable for offline use.',
    url: 'https://phet.colorado.edu',
    category: 'science', language: 'en/fr/sw/ar', offline: true, free: true, format: 'interactive',
  },
  {
    id: 'sciencedaily',
    title: 'Science Daily',
    description: 'Latest science research news, good for reading comprehension and current events.',
    url: 'https://www.sciencedaily.com',
    category: 'science', language: 'en', offline: false, free: true, format: 'article',
  },
  {
    id: 'teded-science',
    title: 'TED-Ed — Science',
    description: 'Short animated educational videos on biology, chemistry, earth science, and more.',
    url: 'https://ed.ted.com/lessons?category=science',
    category: 'science', language: 'en', offline: false, free: true, format: 'video',
  },

  // Language
  {
    id: 'storynory',
    title: 'Storynory',
    description: 'Free audio stories and fairy tales in English — great for listening comprehension.',
    url: 'https://www.storynory.com',
    category: 'language', language: 'en', offline: false, free: true, format: 'audio',
  },
  {
    id: 'readworks',
    title: 'ReadWorks',
    description: 'Free reading passages with comprehension questions aligned to curriculum levels.',
    url: 'https://www.readworks.org',
    category: 'language', language: 'en', offline: false, free: true, format: 'article',
  },
  {
    id: 'british-council-kids',
    title: 'British Council LearnEnglish Kids',
    description: 'Free games, songs, and stories for young English learners.',
    url: 'https://learnenglishkids.britishcouncil.org',
    category: 'language', language: 'en', offline: false, free: true, format: 'interactive',
  },
  {
    id: 'swahili-kamusi',
    title: 'Kamusi Project — Swahili',
    description: 'Free comprehensive Swahili-English dictionary and language resources.',
    url: 'https://www.kamusiproject.org',
    category: 'language', language: 'sw', offline: false, free: true, format: 'tool',
    region: 'East Africa',
  },
  {
    id: 'afrireads',
    title: 'African Storybook',
    description: 'Free storybooks in 200+ African languages for early-grade readers.',
    url: 'https://www.africanstorybook.org',
    category: 'language', language: 'multiple', offline: true, free: true, format: 'printable',
    region: 'Africa',
  },
  {
    id: 'libro-libre',
    title: 'Libro Libre — Spanish',
    description: 'Free Spanish-language children\'s books and literacy materials.',
    url: 'https://www.librolibre.net',
    category: 'language', language: 'es', offline: true, free: true, format: 'printable',
    region: 'Latin America',
  },

  // Geography
  {
    id: 'national-geographic-kids',
    title: 'National Geographic Kids',
    description: 'Country profiles, maps, and wildlife facts presented for young learners.',
    url: 'https://kids.nationalgeographic.com/geography',
    category: 'geography', language: 'en', offline: false, free: true, format: 'article',
  },
  {
    id: 'worldometers',
    title: 'Worldometers',
    description: 'Real-time population, geography, and country statistics — great for data-driven lessons.',
    url: 'https://www.worldometers.info',
    category: 'geography', language: 'en', offline: false, free: true, format: 'tool',
  },
  {
    id: 'geoguessr-lite',
    title: 'Seterra Online',
    description: 'Free map quiz games to learn countries, capitals, and landmarks.',
    url: 'https://www.seterra.com',
    category: 'geography', language: 'en/fr/sw', offline: false, free: true, format: 'interactive',
  },
  {
    id: 'open-street-map',
    title: 'OpenStreetMap',
    description: 'Free community-built world map — downloadable for offline use with OsmAnd or Maps.me.',
    url: 'https://www.openstreetmap.org',
    category: 'geography', language: 'multiple', offline: true, free: true, format: 'tool',
  },

  // Arts
  {
    id: 'tate-kids',
    title: 'Tate Kids',
    description: 'Free art activities, artwork analysis, and creative projects from the Tate galleries.',
    url: 'https://www.tate.org.uk/kids',
    category: 'arts', language: 'en', offline: false, free: true, format: 'interactive',
  },
  {
    id: 'elements-of-art',
    title: 'KidzArt Elements of Art',
    description: 'Printable art lessons covering line, shape, color, texture, and form.',
    url: 'https://www.kidzart.com/free-resources',
    category: 'arts', language: 'en', offline: true, free: true, format: 'printable',
  },
  {
    id: 'chrome-music-lab',
    title: 'Chrome Music Lab',
    description: 'Free, browser-based musical experiments to explore sound, rhythm, and melody.',
    url: 'https://musiclab.chromeexperiments.com',
    category: 'arts', language: 'en', offline: false, free: true, format: 'interactive',
  },
  {
    id: 'smithsonian-arts',
    title: 'Smithsonian Learning Lab',
    description: 'Free curated collections from the Smithsonian for art and cultural education.',
    url: 'https://learninglab.si.edu',
    category: 'arts', language: 'en', offline: false, free: true, format: 'interactive',
  },

  // Technology
  {
    id: 'code-org',
    title: 'Code.org',
    description: 'Free coding courses for all ages — works on low-bandwidth connections.',
    url: 'https://code.org',
    category: 'technology', language: 'en/sw/fr', offline: false, free: true, format: 'interactive',
  },
  {
    id: 'scratch',
    title: 'Scratch',
    description: 'Free visual programming environment for creating stories, games, and animations.',
    url: 'https://scratch.mit.edu',
    category: 'technology', language: 'multiple', offline: false, free: true, format: 'interactive',
  },
  {
    id: 'computer-science-unplugged',
    title: 'CS Unplugged',
    description: 'Free printable computing activities that require no computer — perfect for low-resource settings.',
    url: 'https://www.csunplugged.org',
    category: 'technology', language: 'en', offline: true, free: true, format: 'printable',
  },
  {
    id: 'digital-literacy-google',
    title: 'Google Digital Garage',
    description: 'Free digital literacy courses covering internet safety, search, and basic software.',
    url: 'https://learndigital.withgoogle.com/digitalgarage',
    category: 'technology', language: 'en', offline: false, free: true, format: 'interactive',
  },

  // Teacher resources
  {
    id: 'twinkl-africa',
    title: 'Twinkl Africa Resources',
    description: 'Curriculum-aligned teaching resources including Kenyan, Nigerian, and South African editions.',
    url: 'https://www.twinkl.com/resources/africa',
    category: 'teacher', language: 'en/sw', offline: true, free: false, format: 'printable',
    region: 'Africa',
  },
  {
    id: 'oer-africa',
    title: 'OER Africa',
    description: 'Open Educational Resources for African educators — free curriculum materials and lesson plans.',
    url: 'https://www.oerafrica.org',
    category: 'teacher', language: 'en', offline: true, free: true, format: 'printable',
    region: 'Africa',
  },
  {
    id: 'unesdoc',
    title: 'UNESCO Open Educational Resources',
    description: 'Free multilingual curriculum materials and teacher guides from UNESCO.',
    url: 'https://unesdoc.unesco.org',
    category: 'teacher', language: 'multiple', offline: true, free: true, format: 'printable',
  },
  {
    id: 'teachers-pay-teachers-free',
    title: 'Teachers Pay Teachers — Free',
    description: 'Large library of teacher-created resources with many free options.',
    url: 'https://www.teacherspayteachers.com/Browse/Price-Range/Free',
    category: 'teacher', language: 'en', offline: true, free: true, format: 'printable',
  },
];

export const RESOURCE_CATEGORIES: { key: ResourceCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all',        label: 'All Resources', icon: '🌐' },
  { key: 'math',       label: 'Math',           icon: '📐' },
  { key: 'science',    label: 'Science',         icon: '🔬' },
  { key: 'language',   label: 'Language',        icon: '📚' },
  { key: 'geography',  label: 'Geography',       icon: '🌍' },
  { key: 'arts',       label: 'Arts',            icon: '🎨' },
  { key: 'technology', label: 'Technology',      icon: '💻' },
  { key: 'teacher',    label: 'Teachers',        icon: '🏫' },
];
