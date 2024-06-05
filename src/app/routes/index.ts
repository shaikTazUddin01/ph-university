import { Router } from "express";
import { StudentRoutes } from "../modules/student/student.route";
import { userRouters } from "../modules/user/user.router";
import { AcademicSemesterRoutes } from "../modules/academicSemester/academicSemester.router";
import { academicFaculty } from "../modules/academicFaculty/academicFaculty.router";
import { academicDepartment } from "../modules/academicDepartment/academicDepartment.router";
import { faculty } from "../modules/Faculty/faculty.router";

const router = Router();

const moduleRoutes = [
  {
    path: "/users",
    router: userRouters,
  },
  {
    path: "/students",
    router: StudentRoutes,
  },
  {
    path: "/academic-semesters",
    router: AcademicSemesterRoutes,
  },
  {
    path: "/academic-faculty",
    router: academicFaculty,
  },
  {
    path: "/academic-department",
    router: academicDepartment,
  },
  {
    path: "/faculty",
    router: faculty,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.router));

// router.use('/students',userRouters)
export default router;