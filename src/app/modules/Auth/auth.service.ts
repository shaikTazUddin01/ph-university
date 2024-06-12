import httpStatus from "http-status";
import { AppError } from "../../errors/AppErrors";
import { User } from "../user/user.model";
import { TLoginUser } from "./auth.interface";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../../config";
import { string } from "zod";

const logInUser = async (payload: TLoginUser) => {
  //checking if hte user is exist

  const user = await User.isUserExistsByCustomId(payload.id);
  // console.log(user);
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "This user is not found");
  }
  //checking is the user is already deleted
  const isDeleted = user?.isDeleted;

  if (isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "This user is Deleted");
  }
  //checking is the user is already blocked
  const isStasus = user?.status;

  if (isStasus === "blocked") {
    throw new AppError(httpStatus.FORBIDDEN, "This user is Blocked");
  }

  //checking if the password is correct

  const passwordMatched = await User.isPasswordMatched(
    payload?.password,
    user?.password
  );

  // console.log(passwordMatched);

  if (!passwordMatched) {
    throw new AppError(httpStatus.FORBIDDEN, "password is not matched");
  }

  //create token and sent to the client
  // console.log( "user Id",user?.id);
  // const jwtPayload = {
  //   userId: user?.id,
  //   Id: user?.id,
  //   role: user?.role,
  // };
  const jwtpayload = {
    userId: user?.id,
    role: user?.role,
  };
  // console.log(jwtpayload);
  const accessToken = jwt.sign(jwtpayload, config.jwt_access_secret as string, {
    expiresIn: "10d",
  });

  return {
    accessToken,
    needsPasswordChange: user?.newPasswordChange,
  };
};

const changePassword = async (
  userData: JwtPayload,
  payload: { oldPassword: string; newPassword: string }
) => {
  // console.log(userData);
  const user = await User.isUserExistsByCustomId(userData.userId);
  // console.log(user);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "This user is not found");
  }
  //checking is the user is already deleted
  const isDeleted = user?.isDeleted;

  if (isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "This user is Deleted");
  }
  //checking is the user is already blocked
  const isStasus = user?.status;

  if (isStasus === "blocked") {
    throw new AppError(httpStatus.FORBIDDEN, "This user is Blocked");
  }

  //checking if the password is correct

  // const passwordMatched = await User.isPasswordMatched(
  //   payload?.password,
  //   user?.password
  // );
  if (!(await User.isPasswordMatched(payload.oldPassword, user?.password)))
    throw new AppError(httpStatus.FORBIDDEN, "Password do not matched");

  // console.log(passwordMatched);

  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds)
  );

await User.findOneAndUpdate(
    {
      id: userData.userId,
      role: userData.role,
    },

    {
      password: newHashedPassword,
      newPasswordChange:false,
      passwordChangeAt:new Date()
    }
  );
  return null
};

export const AuthServices = {
  logInUser,
  changePassword,
};
