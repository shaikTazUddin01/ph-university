import mongoose from "mongoose";
import Student from "./student.interface";
import StudentModel from "./student.model";
import { AppError } from "../../errors/AppErrors";
import httpStatus from "http-status";
import { User } from "../user/user.model";

// const createStudentIntoDB = async (student: Student) => {
//   const result = await StudentModel.create(student);

//   return result;
// };

const getAllStudentsFromDb = async () => {
  const result = await StudentModel.find()
    .populate("admissionSemester")
    .populate({
      path: "academicDepartment",
      populate: {
        path: "academicFaculty",
      },
    });

  return result;
};

const getSingleStudentsFromDb = async (id: string) => {
  const result = await StudentModel.findOne({ id })
    .populate("admissionSemester")
    .populate({
      path: "academicDepartment",
      populate: {
        path: "academicFaculty",
      },
    });
  // const result = await StudentModel.findOne({ id });

  return result;
};

const deleteSutdentFromDb = async (id: string) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const deletedStudent = await StudentModel.findOneAndUpdate(
      { id },
      { isDeleted: true },
      { new: true, session }
    );

    if (!deletedStudent) {
      throw new AppError(httpStatus.BAD_REQUEST, "Failed to delete student");
    }

    const deletedUser = await User.findOneAndUpdate(
      { id },
      { isDeleted: true },
      { new: true, session }
    );

    if (!deletedUser) {
      throw new AppError(httpStatus.BAD_REQUEST, "Failed to delete user");
    }

    await session.commitTransaction();
    await session.endSession();

    return deletedStudent;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();

    console.log(error);
  }
};

const updateStudentIntoDB = async (id: string, payload: Partial<Student>) => {
  const { name, guardian, localGuardian, ...remainingStudentData } = payload;

  const modifiedUpdatedData: Record<string, unknown> = {
    ...remainingStudentData,
  };

  if (name && Object.keys(name).length) {
    for (const [key, value] of Object.entries(name)) {
      modifiedUpdatedData[`name.${key}`] = value;
    }
  }

  if (guardian && Object.keys(guardian).length) {
    for (const [key, value] of Object.entries(guardian)) {
      modifiedUpdatedData[`guardian.${key}`] = value;
    }
  }
  if (localGuardian && Object.keys(localGuardian).length) {
    for (const [key, value] of Object.entries(localGuardian)) {
      modifiedUpdatedData[`localGuardian.${key}`] = value;
    }
  }
  console.log(modifiedUpdatedData);

  const result = await StudentModel.findOneAndUpdate({ id }, modifiedUpdatedData, {
    new: true, runValidators:true
  });

  return result;
};

export const StudentServices = {
  // createStudentIntoDB,
  getAllStudentsFromDb,
  getSingleStudentsFromDb,
  deleteSutdentFromDb,
  updateStudentIntoDB,
};
