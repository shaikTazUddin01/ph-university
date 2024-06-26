import httpStatus from "http-status";
import { AppError } from "../../errors/AppErrors";
import { OfferedCourse } from "../offeredCourse/OfferedCourse.model";
import { TEnrolledCourse } from "./enrolledCourse.interface";
import EnrolledCourse from "./enrolledCourse.model";
import StudentModel from "../student/student.model";
import mongoose from "mongoose";
import SemesterRegistration from "../semesterRegistration/semesterRegistration.model";
import { Courses } from "../courses/course.model";
import Faculty from "../Faculty/faculty.model";
import { calculateGradeAndPoints } from "./enrolledCourse.utils";

const createEnrolledCourseIntoDB = async (
  userId: string,
  payload: TEnrolledCourse
) => {
  /**
   * Step1: Check if the offered cousres is exists
   * Step2: Check if the student is already enrolled
   * Step3: Check if the max credits exceed
   * Step4: Create an enrolled course
   */
  const { offeredCourse } = payload;
  const isOfferedCourseExists = await OfferedCourse.findById(offeredCourse);

  if (!isOfferedCourseExists) {
    throw new AppError(httpStatus.NOT_FOUND, "offered course is not found");
  }

  if (isOfferedCourseExists.maxCapacity <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Room is full");
  }

  const student = await StudentModel.findOne({ id: userId }).select("_id");
  if (!student) {
    throw new AppError(httpStatus.NOT_FOUND, "student is not found");
  }
  const isStudentAlreadyEnroll = await EnrolledCourse.findOne({
    semesterRegistration: isOfferedCourseExists?.semesterRegistration,
    offeredCourse,
    student: student._id,
  });

  if (isStudentAlreadyEnroll) {
    throw new AppError(httpStatus.NOT_FOUND, "This course is already enrolled");
  }
  //check total credits exceeds maxCredit
  const semesterRegistration = await SemesterRegistration.findById(
    isOfferedCourseExists?.semesterRegistration
  ).select("maxCredit");

  // console.log(semesterRegistration);

  const enrolledCourse = await EnrolledCourse.aggregate([
    {
      $match: {
        student: student._id,
        semesterRegistration: isOfferedCourseExists.semesterRegistration,
      },
    },
    {
      $lookup: {
        from: "courses",
        localField: "course",
        foreignField: "_id",
        as: "enrolledCourseData",
      },
    },
    {
      $unwind: "$enrolledCourseData",
    },
    {
      $group: {
        _id: null,
        totalenrolledCredits: { $sum: "$enrolledCourseData.credits" },
      },
    },
    {
      $project: {
        _id: 0,
      },
    },
  ]);

  const course = await Courses.findById(isOfferedCourseExists?.course).select(
    "credits"
  );
  // console.log(course);

  // console.log(enrolledCourse);
  const totalCredits =
    enrolledCourse?.length > 0 ? enrolledCourse[0]?.totalenrolledCredits : 0;

  // console.log(totalCredits);

  if (
    semesterRegistration &&
    course &&
    totalCredits + course?.credits > semesterRegistration?.maxCredit
  ) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This course is Exceeded the limit"
    );
  }
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const result = await EnrolledCourse.create(
      [
        {
          semesterRegistration: isOfferedCourseExists?.semesterRegistration,
          academicSemester: isOfferedCourseExists?.academicSemester,
          academicFaculty: isOfferedCourseExists?.academicFaculty,
          academicDepartment: isOfferedCourseExists?.academicDepartment,
          offeredCourse: offeredCourse,
          course: isOfferedCourseExists.course,
          student: student._id,
          faculty: isOfferedCourseExists.faculty,
          isEnrolled: true,
        },
      ],
      { session }
    );

    if (!result) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Failed to Enroll in this course"
      );
    }

    const maxCapacity = isOfferedCourseExists.maxCapacity - 1;

    await OfferedCourse.findOneAndUpdate(
      { _id: offeredCourse },
      {
        maxCapacity: maxCapacity,
      },
      { session }
    );

    await session.commitTransaction();
    await session.endSession();

    return result;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw new Error(error as string);
  }

  // return null;
};

const updateEnrolledCourseMarksIntoDB = async (
  facultyId: string,
  payload: Partial<TEnrolledCourse>
) => {
  const { semesterRegistration, offeredCourse, student, courseMarks } = payload;

  const isSemesterRegistrationExists = await SemesterRegistration.findById(
    semesterRegistration
  );

  if (!isSemesterRegistrationExists) {
    throw new AppError(httpStatus.NOT_FOUND, "This semester is not found");
  }
  const isOfferedCourseExists = await OfferedCourse.findById(offeredCourse);

  if (!isOfferedCourseExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "This offered Course is not found"
    );
  }
  const isStudentExists = await StudentModel.findById(student);
  // console.log(isStudentExists);
  if (!isStudentExists) {
    throw new AppError(httpStatus.NOT_FOUND, "This student is not found");
  }

  const faculty = await Faculty.findOne({ id: facultyId }, { _id: 1 });

  // console.log(faculty._id);
  if (!faculty) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "You are not authorized in this course"
    );
  }

  const isCourseBelongToFaculty = await EnrolledCourse.findOne({
    semesterRegistration,
    offeredCourse,
    student,
    faculty: faculty._id,
  });
  if (!isCourseBelongToFaculty) {
    throw new AppError(httpStatus.FORBIDDEN, "You Forbidden");
  }

  const modifiedData: Record<string, unknown> = {
    ...courseMarks,
  };

  if (courseMarks?.finalTerm) {
    const { classTest1, classTest2, midTerm, finalTerm } = courseMarks;

    const totalMarks =
      Math.ceil(classTest1 * 0.1) +
      Math.ceil(midTerm * 0.3) +
      Math.ceil(classTest2 * 0.1) +
      Math.ceil(finalTerm * 0.5);
    const result = calculateGradeAndPoints(totalMarks);

    modifiedData.grade = result.grade;
    modifiedData.gradePoints = result.gradePoints;
    modifiedData.isCompleted = true;
  }
  if (courseMarks && Object.keys(courseMarks).length) {
    for (const [key, value] of Object.entries(courseMarks)) {
      modifiedData[`courseMarks.${key}`] = value;
    }
  }
// console.log(   isCourseBelongToFaculty?._id ,modifiedData);
  const result = await EnrolledCourse.findByIdAndUpdate(
    isCourseBelongToFaculty?._id,
    modifiedData ,
    {
      new: true,
    }
  );

  // console.log(result);
  return result
};

export const EnrolledCourseServices = {
  createEnrolledCourseIntoDB,
  updateEnrolledCourseMarksIntoDB,
};
