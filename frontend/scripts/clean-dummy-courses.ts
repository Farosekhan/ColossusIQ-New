import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clean() {
  console.log("Cleaning dummy/default courses and related data from PostgreSQL...");

  // 1. Find all learning courses
  const lcs = await prisma.learningCourse.findMany({
    select: { id: true, publicId: true, title: true, courseRecordId: true }
  });
  console.log(`Found ${lcs.length} learning courses:`, lcs.map(c => `${c.publicId} (${c.title})`));

  for (const lc of lcs) {
    // Linked quizzes
    const quizzes = await prisma.quiz.findMany({
      where: { learningCourseId: lc.id },
      select: { id: true, publicId: true }
    });

    for (const q of quizzes) {
      // Delete certificates linked to this quiz
      const certsDeleted = await prisma.certificate.deleteMany({ where: { quizId: q.id } });
      console.log(`Deleted ${certsDeleted.count} certificates for quiz ${q.publicId}`);

      // Delete quiz attempt answers
      const answersDeleted = await prisma.quizAttemptAnswer.deleteMany({
        where: { attempt: { quizId: q.id } }
      });
      console.log(`Deleted ${answersDeleted.count} attempt answers for quiz ${q.publicId}`);

      // Delete quiz attempts
      const attemptsDeleted = await prisma.quizAttempt.deleteMany({ where: { quizId: q.id } });
      console.log(`Deleted ${attemptsDeleted.count} attempts for quiz ${q.publicId}`);

      // Delete quiz questions
      const questionsDeleted = await prisma.quizQuestion.deleteMany({ where: { quizId: q.id } });
      console.log(`Deleted ${questionsDeleted.count} questions for quiz ${q.publicId}`);

      // Delete the quiz
      await prisma.quiz.delete({ where: { id: q.id } });
      console.log(`Deleted quiz ${q.publicId}`);
    }

    // Delete lesson progress
    const progressDeleted = await prisma.lessonProgress.deleteMany({
      where: { lesson: { courseId: lc.id } }
    });
    console.log(`Deleted ${progressDeleted.count} progress rows for course ${lc.publicId}`);

    // Delete lesson images & videos
    await prisma.lessonImage.deleteMany({ where: { lesson: { courseId: lc.id } } });
    await prisma.lessonVideo.deleteMany({ where: { lesson: { courseId: lc.id } } });

    // Delete lessons
    const lessonsDeleted = await prisma.lesson.deleteMany({ where: { courseId: lc.id } });
    console.log(`Deleted ${lessonsDeleted.count} lessons for course ${lc.publicId}`);

    // Delete course units
    const unitsDeleted = await prisma.courseUnit.deleteMany({ where: { courseId: lc.id } });
    console.log(`Deleted ${unitsDeleted.count} units for course ${lc.publicId}`);

    // Delete course outcomes
    const outcomesDeleted = await prisma.courseOutcome.deleteMany({ where: { courseId: lc.id } });
    console.log(`Deleted ${outcomesDeleted.count} outcomes for course ${lc.publicId}`);

    // Delete learning course
    await prisma.learningCourse.delete({ where: { id: lc.id } });
    console.log(`Deleted learning course ${lc.publicId} (${lc.title})`);

    // Clean up auto-created course record if present
    if (lc.courseRecordId) {
      await prisma.course.delete({ where: { id: lc.courseRecordId } }).catch((err) => {
        console.log(`Note: course record ${lc.courseRecordId} could not be deleted (might be referenced):`, err.message);
      });
    }
  }

  // Also clean up any orphan course records that were created by previous test runs (CRS-1025, CRS-1026, CRS-1017)
  const orphanCodes = ["CSE101", "CSE102", "AID101"];
  for (const code of orphanCodes) {
    const orphan = await prisma.course.findFirst({ where: { code } });
    if (orphan) {
      await prisma.course.delete({ where: { id: orphan.id } }).catch(() => {});
      console.log(`Cleaned up orphan course record ${code}`);
    }
  }

  console.log("Cleanup completed successfully!");
}

clean().catch(console.error).finally(() => prisma.$disconnect());
