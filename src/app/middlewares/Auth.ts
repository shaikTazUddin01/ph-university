import { NextFunction, Request, Response } from "express";
import catchAsync from "../utils/cathcAsync";
import { AppError } from "../errors/AppErrors";
import httpStatus from "http-status";

const auth = () => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req?.headers?.authorization;
if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED,'you are not authorized.!')
}
    console.log(token);
    next();
  });
};

export default auth;
