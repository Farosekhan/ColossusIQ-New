import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const learningCourses = await prisma.learningCourse.findMany({
    select: { id: true, publicId: true, title: true, status: true, collegeId: true }
  });
  console.log('learning_courses in DB:', JSON.stringify(learningCourses, null, 2));

  const courses = await prisma.course.findMany({
    select: { id: true, publicId: true, code: true, title: true, status: true }
  });
  console.log('courses in DB:', JSON.stringify(courses, null, 2));

  const quizzes = await prisma.quiz.findMany({
    select: { id: true, publicId: true, title: true, purpose: true, learningCourseId: true }
  });
  console.log('quizzes in DB:', JSON.stringify(quizzes, null, 2));

  const certs = await prisma.certificate.findMany({
    select: { id: true, publicId: true, title: true, quizId: true }
  });
  console.log('certificates in DB:', JSON.stringify(certs, null, 2));

  const progress = await prisma.lessonProgress.count();
  console.log('lessonProgress count:', progress);

  const attempts = await prisma.quizAttempt.count();
  console.log('quizAttempt count:', attempts);
}

main().catch(console.error).finally(() => prisma.$disconnect());
