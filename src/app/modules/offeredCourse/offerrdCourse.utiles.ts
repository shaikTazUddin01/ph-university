import { TDays, TSchedule } from "./OfferedCourse.interface"


export const hasTimeConflict =(assignedSchedules:TSchedule[] ,newSchedule:TSchedule)=>{
for(const schedule of assignedSchedules){
    const existingStartTime = new Date(`1970-01-01T${schedule.startTime}`);
    const existingEndTime = new Date(`1970-01-01T${schedule.endTime}`);
    const newStartingTime = new Date(`1970-01-01T${newSchedule.startTime}`);
    const newEndTime = new Date(`1970-01-01T${newSchedule.endTime}`);

    if (newStartingTime < existingEndTime && newEndTime > existingStartTime) {
      return true
    }
}
    // assignedSchedules.forEach((schedule) => {
        
    //   });
     return false
}