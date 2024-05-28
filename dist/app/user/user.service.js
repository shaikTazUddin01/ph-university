"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const config_1 = __importDefault(require("../config"));
const student_model_1 = __importDefault(require("../student/student.model"));
// import { NewUser } from "./user.interface";
const user_model_1 = require("./user.model");
const createStudentInToDB = (password, studentData) => __awaiter(void 0, void 0, void 0, function* () {
    //create a user object
    const userData = {};
    //if password is not given ,use deafult
    userData.password = password || config_1.default.default_pass;
    // if (!password) {
    //     user.password=config.default_pass as string ;
    // }else{
    //     user.password=password
    // }
    //set student role
    userData.role = "student";
    //manually generated it
    userData.id = "2030100001";
    //create a user
    const newUser = yield user_model_1.User.create(userData);
    //create a student
    if (Object.keys(newUser).length) {
        //set id , _id as user
        studentData.id = newUser.id;
        studentData.user = newUser._id; //reference_id
        const newStudent = yield student_model_1.default.create(studentData);
        return newStudent;
    }
});
exports.UserService = {
    createStudentInToDB,
};
