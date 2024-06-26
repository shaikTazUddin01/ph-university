import { TFaculty } from "./faculty.interface";
import Faculty from "./faculty.model";


const findAllFacultyFromDB=async()=>{

  const result= await Faculty.find()
  return result
}

const findSingleFacultyFromDB=async(id : string)=>{

  const result= await Faculty.findById(id)
  return result
}
const updateFacultyInToDB=async(id : string,payload :Partial<TFaculty>)=>{

  const result= await Faculty.findByIdAndUpdate(id,payload,{
    new:true
  })
  return result
}
const deleteFacultyIntoDB=async(id : string)=>{

  const result= await Faculty.findByIdAndUpdate(id,{isDeleted:true},{
    new:true
  })
  return result
}

export const facultyServices = {
  // createFacultyInToDB,
  findAllFacultyFromDB,
  findSingleFacultyFromDB,
  updateFacultyInToDB,
  deleteFacultyIntoDB
};
