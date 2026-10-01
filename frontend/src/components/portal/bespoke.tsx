import { Suspense } from "react";
import type { ModuleDef } from "@/config/modules";
import type { Role } from "@/lib/auth/roles";
import { ModuleHeader } from "@/components/modules/module-header";
import { TemplateSkeleton } from "@/components/modules/shared";
import { MentorModule } from "./bespoke/mentor";
import { StudyPlannerModule } from "./bespoke/study-planner";
import { CoursesModule } from "./bespoke/courses";
import { MockTestsModule } from "./bespoke/mock-tests";
import { HandwrittenModule } from "./bespoke/handwritten";
import { EvaluationReviewModule } from "./bespoke/evaluation-review";
import { ResumeModule } from "./bespoke/resume";
import { InterviewModule } from "./bespoke/interview";
import { ProjectsModule } from "./bespoke/projects";
import { RolesPermissionsModule } from "./bespoke/roles-permissions";
import { CollegeWebsiteModule } from "./bespoke/college-website";
import { AiCourseStudioModule } from "./bespoke/ai-course-studio";
import { QuizBuilderModule } from "./bespoke/quiz-builder";
import { MyQuizzesModule } from "./bespoke/my-quizzes";
import { IssuedCertificatesModule, MyCertificatesModule } from "./bespoke/certificates";
import { PlacementBoardModule, PlacementReadinessModule } from "./bespoke/placement-readiness";
import { TeachingStudioModule } from "@/components/teaching/teaching-studio";
import { SkillBoosterModule } from "@/components/teaching/skill-booster";
import { ClassNotesModule } from "@/components/teaching/class-notes";
import { BiAnalyticsModule } from "./bespoke/bi-analytics";
import { ClubsModule } from "./bespoke/clubs";
import { SportsModule } from "./bespoke/sports";
import { SecuritySettingsModule } from "./bespoke/security-settings";
import { AcademicCalendarModule } from "./bespoke/academic-calendar";

const BESPOKE: Record<string, (props: { role: Role }) => React.ReactNode> = {
  "academic-calendar": ({ role }) => <AcademicCalendarModule role={role} />,
  "bi-analytics": () => <BiAnalyticsModule />,
  clubs: ({ role }) => <ClubsModule role={role} />,
  sports: ({ role }) => <SportsModule role={role} />,
  "security-settings": () => <SecuritySettingsModule />,
  mentor: () => <MentorModule />,
  "study-planner": () => <StudyPlannerModule />,
  courses: () => <CoursesModule />,
  "mock-tests": () => <MockTestsModule />,
  handwritten: () => <HandwrittenModule />,
  evaluation: () => <EvaluationReviewModule />,
  resume: () => <ResumeModule />,
  interview: () => <InterviewModule />,
  projects: ({ role }) => <ProjectsModule role={role} />,
  "roles-permissions": () => <RolesPermissionsModule />,
  "college-website": () => <CollegeWebsiteModule />,
  "ai-course-studio": ({ role }) => <AiCourseStudioModule role={role} />,
  "quiz-builder": () => <QuizBuilderModule />,
  "my-quizzes": () => <MyQuizzesModule />,
  "my-certificates": () => <MyCertificatesModule />,
  "issued-certificates": () => <IssuedCertificatesModule />,
  "placement-readiness": () => <PlacementReadinessModule />,
  "placement-board": () => <PlacementBoardModule />,
  "teaching-studio": () => <TeachingStudioModule />,
  "skill-booster": ({ role }) => <SkillBoosterModule role={role} />,
  "class-notes": () => <ClassNotesModule />,
};

export function hasBespoke(slug: string): boolean {
  return slug in BESPOKE;
}

export function BespokeModule({ mod, role }: { mod: ModuleDef; role: Role }) {
  const Render = BESPOKE[mod.slug];
  return (
    <div>
      <ModuleHeader mod={mod} role={role} />
      <Suspense fallback={<TemplateSkeleton />}>{Render ? <Render role={role} /> : null}</Suspense>
    </div>
  );
}
