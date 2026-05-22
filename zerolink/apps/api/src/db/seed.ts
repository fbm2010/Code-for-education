/**
 * Comprehensive seed for ZeroLink.
 * Run: npm run db:seed
 * Also exported as seedIfEmpty() for auto-seeding on first startup.
 */
import 'dotenv/config';
import { db } from './index.js';
import {
  categories, courses, lessons, lessonContent, quizzes, resources,
  users, userPreferences, studyStreaks, enrollments, lessonProgress,
  srCards,
} from './schema.js';
import { hash } from '@node-rs/argon2';

const argon2Options = { memoryCost: 65536, timeCost: 3, outputLen: 32, parallelism: 1 };

function todayStr(): string { return new Date().toISOString().split('T')[0]!; }
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0]!;
}

/** Call this at server startup to seed the DB if it has no categories yet. */
export async function seedIfEmpty(): Promise<boolean> {
  const existing = await db.select().from(categories).limit(1);
  if (existing.length > 0) return false;
  await seed();
  return true;
}

async function seed() {
  console.log('🌱 Seeding ZeroLink database…');

  // ── Categories ───────────────────────────────────────────────
  const [mathCat, sciCat, langCat, histCat, techCat] = await db
    .insert(categories)
    .values([
      { slug: 'math-valley',    name: { en: 'Math Valley',         sw: 'Bonde la Hisabati'     }, icon: '📐', sortOrder: 1 },
      { slug: 'science-plains', name: { en: 'Science Plains',      sw: 'Tambarare la Sayansi'  }, icon: '🔬', sortOrder: 2 },
      { slug: 'language-river', name: { en: 'Language River',      sw: 'Mto wa Lugha'          }, icon: '📚', sortOrder: 3 },
      { slug: 'history-peaks',  name: { en: 'History Peaks',       sw: 'Milima ya Historia'    }, icon: '🏔️', sortOrder: 4 },
      { slug: 'tech-forest',    name: { en: 'Technology Forest',   sw: 'Msitu wa Teknolojia'   }, icon: '💻', sortOrder: 5 },
    ])
    .returning()
    .onConflictDoNothing();

  if (!mathCat) { console.log('ℹ️  Already seeded — skipping'); return; }

  // ── Courses (2 per category) ─────────────────────────────────
  const [mathC1, mathC2] = await db.insert(courses).values([
    { categoryId: mathCat.id,  slug: 'math-foundations', title: { en: 'Math Foundations', sw: 'Misingi ya Hisabati' }, difficulty: 'beginner',     estimatedMinutes: 90,  published: true, tags: ['math'] },
    { categoryId: mathCat.id,  slug: 'algebra-basics',   title: { en: 'Algebra Basics',   sw: 'Misingi ya Aljebra'  }, difficulty: 'intermediate', estimatedMinutes: 120, published: true, tags: ['math','algebra'] },
  ]).returning();

  const [sciC1, sciC2] = await db.insert(courses).values([
    { categoryId: sciCat!.id,  slug: 'science-explorers', title: { en: 'Science Explorers',  sw: 'Wachunguzi wa Sayansi' }, difficulty: 'beginner', estimatedMinutes: 100, published: true, tags: ['science'] },
    { categoryId: sciCat!.id,  slug: 'earth-and-space',   title: { en: 'Earth & Space',      sw: 'Dunia na Anga'        }, difficulty: 'beginner', estimatedMinutes: 80,  published: true, tags: ['science','geography'] },
  ]).returning();

  const [langC1, langC2] = await db.insert(courses).values([
    { categoryId: langCat!.id, slug: 'english-beginners', title: { en: 'English for Beginners', sw: 'Kiingereza kwa Wanaoanza' }, difficulty: 'beginner', estimatedMinutes: 90, published: true, tags: ['language','english'] },
    { categoryId: langCat!.id, slug: 'swahili-basics',    title: { en: 'Swahili Basics',        sw: 'Misingi ya Kiswahili'   }, difficulty: 'beginner', estimatedMinutes: 85, published: true, tags: ['language','swahili'] },
  ]).returning();

  const [histC1, histC2] = await db.insert(courses).values([
    { categoryId: histCat!.id, slug: 'african-history',   title: { en: 'African History',       sw: 'Historia ya Afrika'    }, difficulty: 'beginner',     estimatedMinutes: 100, published: true, tags: ['history','africa'] },
    { categoryId: histCat!.id, slug: 'world-history-101', title: { en: 'World History 101',     sw: 'Historia ya Dunia 101' }, difficulty: 'intermediate', estimatedMinutes: 110, published: true, tags: ['history'] },
  ]).returning();

  const [techC1, techC2] = await db.insert(courses).values([
    { categoryId: techCat!.id, slug: 'intro-to-computers', title: { en: 'Intro to Computers', sw: 'Utangulizi wa Kompyuta' }, difficulty: 'beginner',     estimatedMinutes: 80, published: true, tags: ['tech','computers'] },
    { categoryId: techCat!.id, slug: 'digital-literacy',   title: { en: 'Digital Literacy',   sw: 'Kusoma Dijitali'       }, difficulty: 'intermediate', estimatedMinutes: 90, published: true, tags: ['tech','digital'] },
  ]).returning();

  const allCourses = [mathC1!, mathC2!, sciC1!, sciC2!, langC1!, langC2!, histC1!, histC2!, techC1!, techC2!];

  // ── Lessons (3 per course) ────────────────────────────────────
  const allLessons: (typeof lessons.$inferSelect)[] = [];

  for (const course of allCourses) {
    const lessonRows = await db.insert(lessons).values([
      { courseId: course.id, slug: 'lesson-1', title: { en: `${(course.title as Record<string,string>)['en']} — Part 1`, sw: 'Sehemu ya 1' }, sortOrder: 1, estimatedMinutes: 15, contentType: 'mixed', published: true },
      { courseId: course.id, slug: 'lesson-2', title: { en: `${(course.title as Record<string,string>)['en']} — Part 2`, sw: 'Sehemu ya 2' }, sortOrder: 2, estimatedMinutes: 20, contentType: 'text',  published: true },
      { courseId: course.id, slug: 'lesson-3', title: { en: `${(course.title as Record<string,string>)['en']} — Part 3`, sw: 'Sehemu ya 3' }, sortOrder: 3, estimatedMinutes: 20, contentType: 'text',  published: true },
    ]).returning();
    allLessons.push(...lessonRows);
  }

  // ── Lesson content (English + Swahili per lesson) ─────────────
  for (const lesson of allLessons) {
    const titleEn = (lesson.title as Record<string, string>)['en'] ?? 'Lesson';
    await db.insert(lessonContent).values([
      {
        lessonId: lesson.id,
        language: 'en',
        version:  1,
        bodyHtml: `<h1>${titleEn}</h1><p>Welcome to this lesson. In this section you will explore foundational concepts that build your understanding step by step.</p><h2>Key Concepts</h2><ul><li>Understanding the basics</li><li>Applying what you know</li><li>Reviewing and reinforcing</li></ul>`,
        bodyText: `${titleEn}. Welcome to this lesson. Key concepts: understanding the basics, applying what you know, reviewing and reinforcing.`,
        checksum: `sha256:${Buffer.from(titleEn + 'en').toString('hex').slice(0, 40)}`,
        sizeBytes: 1024,
        published: true,
      },
      {
        lessonId: lesson.id,
        language: 'sw',
        version:  1,
        bodyHtml: `<h1>${titleEn}</h1><p>Karibu kwenye somo hili. Katika sehemu hii utachunguza dhana za msingi ambazo hujenga uelewa wako hatua kwa hatua.</p><h2>Dhana Muhimu</h2><ul><li>Kuelewa misingi</li><li>Kutumia unachojua</li><li>Kukagua na kuimarisha</li></ul>`,
        bodyText: `${titleEn}. Karibu kwenye somo hili. Dhana muhimu: kuelewa misingi, kutumia unachojua, kukagua na kuimarisha.`,
        checksum: `sha256:${Buffer.from(titleEn + 'sw').toString('hex').slice(0, 40)}`,
        sizeBytes: 900,
        published: true,
      },
    ]).onConflictDoNothing();

    // 5 quiz questions per lesson
    await db.insert(quizzes).values({
      lessonId: lesson.id,
      language: 'en',
      questions: [
        { id: 'q1', type: 'multiple_choice', prompt: { en: 'Which of the following is a key concept in this lesson?', sw: 'Ipi kati ya hizi ni dhana muhimu katika somo hili?' },
          options: [
            { id: 'a', text: { en: 'Understanding the basics', sw: 'Kuelewa misingi' } },
            { id: 'b', text: { en: 'Ignoring fundamentals',   sw: 'Kupuuza misingi' } },
            { id: 'c', text: { en: 'Skipping reviews',        sw: 'Kuruka mapitio'  } },
            { id: 'd', text: { en: 'None of the above',       sw: 'Hakuna ya hapo juu' } },
          ],
          correct: 'a',
          explanation: { en: 'Understanding the basics is the foundation of all learning.', sw: 'Kuelewa misingi ndio msingi wa kujifunza.' },
        },
        { id: 'q2', type: 'true_false', prompt: { en: 'Reviewing material helps reinforce learning.' },
          options: [{ id: 'true', text: { en: 'True' } }, { id: 'false', text: { en: 'False' } }],
          correct: 'true', explanation: { en: 'Yes, repetition and review strengthen memory.' },
        },
        { id: 'q3', type: 'multiple_choice', prompt: { en: 'What is the second step in this lesson?' },
          options: [
            { id: 'a', text: { en: 'Applying what you know' } },
            { id: 'b', text: { en: 'Starting from scratch' } },
            { id: 'c', text: { en: 'Skipping basics' } },
            { id: 'd', text: { en: 'None of the above' } },
          ],
          correct: 'a', explanation: { en: 'Applying knowledge bridges theory and practice.' },
        },
        { id: 'q4', type: 'true_false', prompt: { en: 'It is OK to skip foundational concepts.' },
          options: [{ id: 'true', text: { en: 'True' } }, { id: 'false', text: { en: 'False' } }],
          correct: 'false', explanation: { en: 'Foundations are essential — do not skip them.' },
        },
        { id: 'q5', type: 'multiple_choice', prompt: { en: 'How many key concepts are introduced in this lesson?' },
          options: [
            { id: 'a', text: { en: '1' } }, { id: 'b', text: { en: '2' } },
            { id: 'c', text: { en: '3' } }, { id: 'd', text: { en: '4' } },
          ],
          correct: 'c', explanation: { en: 'Three key concepts: understand, apply, review.' },
        },
      ],
    }).onConflictDoNothing();
  }

  // ── Admin user ────────────────────────────────────────────────
  const adminHash = await hash('ZeroLink_Admin_2025!', argon2Options);
  const [adminUser] = await db.insert(users).values({
    email:        'admin@zerolink.app',
    displayName:  'Admin',
    passwordHash: adminHash,
    role:         'admin',
    isGuest:      false,
  }).returning().onConflictDoNothing();

  if (adminUser) {
    await db.insert(userPreferences).values({ userId: adminUser.id }).onConflictDoNothing();
    await db.insert(studyStreaks).values({ userId: adminUser.id }).onConflictDoNothing();
  }

  // ── Test user ─────────────────────────────────────────────────
  const testHash = await hash('TestUser_2025!', argon2Options);
  const [testUser] = await db.insert(users).values({
    email:        'test@zerolink.app',
    displayName:  'Test User',
    passwordHash: testHash,
    isGuest:      false,
  }).returning().onConflictDoNothing();

  if (testUser) {
    await db.insert(userPreferences).values({ userId: testUser.id, dailyStudyMinutes: 45, preferredTechniques: ['spaced_repetition', 'interleaving'] }).onConflictDoNothing();

    // Enroll in 3 courses
    const enrollCourses = [mathC1!, sciC1!, langC1!];
    for (const c of enrollCourses) {
      if (c) await db.insert(enrollments).values({ userId: testUser.id, courseId: c.id }).onConflictDoNothing();
    }

    // Progress on 5 lessons (mix of statuses)
    const progressLessons = allLessons.slice(0, 5);
    const statuses: ('not_started' | 'in_progress' | 'completed')[] = ['completed', 'completed', 'in_progress', 'in_progress', 'not_started'];
    for (let i = 0; i < progressLessons.length; i++) {
      const lesson = progressLessons[i]!;
      await db.insert(lessonProgress).values({
        userId:          testUser.id,
        lessonId:        lesson.id,
        status:          statuses[i]!,
        percentComplete: statuses[i] === 'completed' ? 100 : statuses[i] === 'in_progress' ? 50 : 0,
        timeSpentSec:    statuses[i] === 'completed' ? 900 : 0,
        lastAccessed:    new Date(),
      }).onConflictDoNothing();
    }

    // 10 SR cards with staggered next_review dates
    for (let i = 0; i < 10; i++) {
      const lesson = allLessons[i % allLessons.length]!;
      await db.insert(srCards).values({
        userId:      testUser.id,
        lessonId:    lesson.id,
        term:        { front: `Flashcard front ${i + 1}`, back: `Flashcard back ${i + 1}`, language: 'en' },
        easeFactor:  2.5,
        intervalDays: Math.max(1, i * 2),
        repetitions: i,
        nextReview:  i < 5 ? todayStr() : daysFromNow(i - 3),
      }).onConflictDoNothing();
    }

    // Streak of 5 days
    const fiveDaysAgo = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0]!;
    })();
    await db.insert(studyStreaks).values({
      userId:        testUser.id,
      currentStreak: 5,
      longestStreak: 5,
      lastStudyDate: fiveDaysAgo,
    }).onConflictDoNothing();
  }

  // ── Community resources (Nairobi, Kenya) ──────────────────────
  await db.insert(resources).values([
    {
      name:        'Nairobi City Library',
      type:        'library',
      description: 'Main public library with free Wi-Fi and device lending.',
      address:     'Ngong Road, Nairobi, Kenya',
      lat:         -1.2921,
      lng:         36.8219,
      languages:   ['en', 'sw'],
      subjects:    ['all'],
      verified:    true,
    },
    {
      name:        'Westlands Free Wi-Fi Zone',
      type:        'wifi_spot',
      description: 'Free public Wi-Fi at Westlands shopping area.',
      address:     'Westlands, Nairobi, Kenya',
      lat:         -1.2675,
      lng:         36.8028,
      languages:   ['en'],
      subjects:    ['all'],
      verified:    true,
    },
    {
      name:        'Kenya ICT Authority Device Loans',
      type:        'device_loan',
      description: 'Short-term tablet and laptop loans for students.',
      address:     'Telposta Towers, Nairobi, Kenya',
      lat:         -1.2843,
      lng:         36.8233,
      languages:   ['en', 'sw'],
      subjects:    ['all'],
      verified:    false,
    },
  ]).onConflictDoNothing();

  console.log('✅ Seed complete — categories:', 5, '| courses:', 10, '| lessons:', allLessons.length);
}

// Only auto-run when executed directly (npm run db:seed)
const isMain = process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js');
if (isMain) {
  seed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
