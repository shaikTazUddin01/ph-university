import QueryBuilder from "../../builder/QueryBuilder";
import { CouserSearchAbleField } from "./course.constant";
import { TCourses } from "./course.interface";
import { Courses } from "./course.model";
import { course } from "./course.router";

const createCourseInToDB = async (paylod: TCourses) => {
  const result = await Courses.create(paylod);
  return result;
};

const findCourseFormDB = async (query: Record<string, unknown>) => {
  const courseQuery = new QueryBuilder(
    Courses.find().populate("perRequisteCourses.courses"),
    query
  )
    .search(CouserSearchAbleField)
    .filter()
    .sort()
    .paginate()
    .fields();
  const result = await courseQuery.modelQuery;

  return result;
};

const findSingleCourseFromDB = async (id: string) => {
  const result = await Courses.findById(id).populate(
    "perRequisteCourses.courses"
  );
  return result;
};

const DeleteCourseFromDB = async (id: string) => {
  const result = await Courses.findByIdAndUpdate(
    id,
    { isDeleted: true },
    {
      new: true,
    }
  );
  return result;
};

const updateCourseInToDB = async (id: string, paylod: Partial<TCourses>) => {
  const { perRequisteCourses, ...CourseInfo } = paylod;
  // console.log(id);
  const updateCourse = await Courses.findByIdAndUpdate(id, CourseInfo, {
    new: true,
    runValidators: true,
  });
  console.log(perRequisteCourses);
  if (perRequisteCourses?.length > 0) {
    const deletePerRequiste=perRequisteCourses?.filter(el=>el.courses &&el?.isDeleted).map(el=>el?.courses)
   
//filter out deleted field
    const deletePerRequisteCourses= await Courses.findByIdAndUpdate(id,
      {
        $pull:{perRequisteCourses:{courses:{$in:deletePerRequiste}}}
      },{
        new:true
      }
    )
    const newPerRequiste=perRequisteCourses?.filter(el=>el.courses && el?.isDeleted !=true)
    
    const newPerRequisteCourses= await Courses.findByIdAndUpdate(id,
      {
        $addToSet:{perRequisteCourses:{$each:newPerRequiste}}
      }
    )

  }
  const result=await Courses.findById(id).populate("perRequisteCourses.courses")
  return result;
};

export const CourseServices = {
  createCourseInToDB,
  findCourseFormDB,
  findSingleCourseFromDB,
  DeleteCourseFromDB,
  updateCourseInToDB,
};
