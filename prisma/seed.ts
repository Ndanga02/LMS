import "dotenv/config";
import { prisma } from "@/lib/db";
import { ensurePlatformTenant } from "@/lib/tenant";

async function main() {
  const platform = await ensurePlatformTenant();

  // Ensure nice default branding for platform (orange premium)
  await prisma.tenant.update({
    where: { id: platform.id },
    data: {
      primaryColor: "#f97316",
      secondaryColor: "#0a0a0a",
      accentColor: "#f97316",
      description: "The main public marketplace and platform for SemtexTech courses. Lease your own beautifully branded tenant at /t/your-org with full retention tools.",
      welcomeMessage: "Welcome to world-class learning. Build streaks, earn achievements, and master new skills with a premium experience.",
    },
  });

  console.log(`Platform tenant ready: ${platform.slug} (${platform.id})`);

  // ────────────────────────────────────────────────────────────────────────────
  // Platform-wide + tenant achievements (gamification / retention delight)
  // ────────────────────────────────────────────────────────────────────────────
  const achievements = [
    {
      code: "first-lesson",
      title: "First Steps",
      description: "Completed your very first lesson. Momentum starts here.",
      icon: "🚀",
      points: 10,
    },
    {
      code: "streak-3",
      title: "On Fire",
      description: "Maintained a 3-day learning streak.",
      icon: "🔥",
      points: 25,
    },
    {
      code: "streak-7",
      title: "Week Warrior",
      description: "7-day streak! You're building a powerful habit.",
      icon: "🔥🔥",
      points: 50,
    },
    {
      code: "quiz-master",
      title: "Quiz Master",
      description: "Passed your first quiz with flying colors.",
      icon: "🧠",
      points: 15,
    },
    {
      code: "course-complete",
      title: "Course Completer",
      description: "Finished an entire course. Certificate earned!",
      icon: "🎓",
      points: 100,
    },
    {
      code: "note-taker",
      title: "Thoughtful Learner",
      description: "Added your first personal lesson note.",
      icon: "📝",
      points: 10,
    },
    {
      code: "bookmark-pro",
      title: "Bookmark Pro",
      description: "Created 3+ bookmarks to revisit key moments.",
      icon: "🔖",
      points: 15,
    },
    {
      code: "reviewer",
      title: "Community Voice",
      description: "Left your first course review. Help others learn.",
      icon: "⭐",
      points: 10,
    },
  ];

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      create: {
        code: ach.code,
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        points: ach.points,
        tenantId: null, // platform global
      },
      update: {
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        points: ach.points,
      },
    });
  }
  console.log(`Seeded ${achievements.length} platform achievements`);

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (superAdminEmail) {
    const adminUser = await prisma.user.findUnique({
      where: { email: superAdminEmail },
    });

    if (adminUser) {
      await prisma.user.update({
        where: { email: superAdminEmail },
        data: { platformRole: "SUPER_ADMIN" },
      });
      await prisma.tenantMembership.upsert({
        where: {
          tenantId_userId: { tenantId: platform.id, userId: adminUser.id },
        },
        create: {
          tenantId: platform.id,
          userId: adminUser.id,
          role: "TENANT_ADMIN",
        },
        update: { role: "TENANT_ADMIN" },
      });
      console.log(`Promoted ${superAdminEmail} to SUPER_ADMIN + platform admin`);
    } else {
      console.log(
        `No user with email ${superAdminEmail} yet — sign in once, then re-run seed.`,
      );
    }
  }

  const existingCourses = await prisma.course.count({
    where: { tenantId: platform.id },
  });

  if (existingCourses === 0) {
    // Rich sample course demonstrating retention features (create in steps for reliable nesting)
    const course = await prisma.course.create({
      data: {
        tenantId: platform.id,
        title: "Getting Started with SemtexTech LMS",
        slug: "getting-started",
        description:
          "Master the platform that helps organizations retain learners through beautiful experiences, streaks, achievements, notes, quizzes and community.",
        level: "ALL_LEVELS",
        priceCents: 0,
        status: "PUBLISHED",
        tags: ["onboarding", "platform", "retention"],
        category: "Platform",
        isFeatured: true,
        whatYouWillLearn: [
          "Understand multi-tenancy, branding, and the two enrollment models",
          "Use the delightful video player with notes, speed control & bookmarks",
          "Build learning streaks and earn beautiful achievements",
          "Take quizzes, leave notes, and join course discussions",
          "Track real progress and earn certificates automatically",
        ],
        requirements: ["A verified email address", "Curiosity and 15 minutes"],
        estimatedDurationMin: 25,
        publishedAt: new Date(),
      },
    });

    // Section 1
    const foundations = await prisma.courseSection.create({
      data: {
        courseId: course.id,
        title: "Platform Foundations",
        description: "Core concepts that make this the retention platform of choice.",
        order: 1,
      },
    });

    await prisma.lesson.createMany({
      data: [
        {
          courseId: course.id,
          sectionId: foundations.id,
          title: "Welcome to Retention-First Learning",
          slug: "welcome",
          content:
            "This platform is built from the ground up for long-term engagement. Every feature (streaks, notes, quizzes, community) exists to make students come back and companies stay.",
          order: 1,
          isPublished: true,
          durationMin: 4,
          type: "TEXT",
        },
        {
          courseId: course.id,
          sectionId: foundations.id,
          title: "Beautiful Video Experience",
          slug: "video-experience",
          content:
            "Our custom player supports direct video, resume exactly where you left off, variable speed, personal notes tied to lessons, and timestamped bookmarks. Retention loves convenience.",
          videoUrl: "https://www.youtube.com/watch?v=3JZ_2t0L8vI",
          order: 2,
          isPublished: true,
          durationMin: 6,
          type: "VIDEO",
        },
      ],
    });

    // Section 2
    const mastery = await prisma.courseSection.create({
      data: {
        courseId: course.id,
        title: "Engagement & Mastery",
        description: "Quizzes, notes, streaks and community — the secret sauce.",
        order: 2,
      },
    });

    const quizDueDate = new Date();
    quizDueDate.setDate(quizDueDate.getDate() + 7); // 7 days from now

    const quizLesson = await prisma.lesson.create({
      data: {
        courseId: course.id,
        sectionId: mastery.id,
        title: "Quick Knowledge Check",
        slug: "quick-quiz",
        content: "Test what you've learned so far. Passing quizzes earns points and the Quiz Master achievement.",
        order: 1,
        isPublished: true,
        durationMin: 5,
        type: "QUIZ",
        dueDate: quizDueDate,
      },
    });

    await prisma.lesson.createMany({
      data: [
        {
          courseId: course.id,
          sectionId: mastery.id,
          title: "Your Learning Dashboard & Streaks",
          slug: "streaks-dashboard",
          content:
            "Visit your dashboard daily. Maintain your streak, see achievements, continue courses with one click. Companies love the retention analytics this drives.",
          order: 2,
          isPublished: true,
          durationMin: 4,
          type: "TEXT",
        },
        {
          courseId: course.id,
          sectionId: mastery.id,
          title: "Notes, Bookmarks & Community",
          slug: "notes-bookmarks-community",
          content:
            "Leave notes on any lesson. Bookmark key moments in videos. Comment in the course discussion to help others (and yourself remember).",
          order: 3,
          isPublished: true,
          durationMin: 5,
          type: "TEXT",
        },
      ],
    });

    // Create the quiz + questions for the quiz lesson (key retention/engagement feature)
    const quiz = await prisma.quiz.create({
      data: {
        lessonId: quizLesson.id,
        title: "Platform Basics Check",
        description: "Quick 3-question quiz to reinforce the core ideas. Score 66%+ to pass.",
        passingScore: 66,
      },
    });

    await prisma.quizQuestion.createMany({
      data: [
        {
          quizId: quiz.id,
          order: 1,
          question: "What is the primary goal of this platform's design?",
          options: ["Cheap hosting", "Maximum learner retention and delight", "Only selling certificates", "Replacing Zoom"],
          correctIndex: 1,
        },
        {
          quizId: quiz.id,
          order: 2,
          question: "Which feature helps you resume a video lesson exactly where you stopped?",
          options: ["Lesson notes", "Last position tracking", "Course reviews", "Tenant API keys"],
          correctIndex: 1,
        },
        {
          quizId: quiz.id,
          order: 3,
          question: "Earning achievements and maintaining streaks primarily helps with:",
          options: ["Making the UI slower", "Increasing long-term engagement and habit formation", "Reducing server costs", "Hiding course content"],
          correctIndex: 1,
        },
      ],
    });

    console.log("Created rich retention-focused sample course: getting-started (with sections, quiz lesson, and 3 questions)");
  }

  console.log("✅ Seed complete. Retention features ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
