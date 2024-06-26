import httpStatus from "http-status";
import { AppError } from "../../errors/AppErrors";
import { User } from "../user/user.model";
import { TLoginUser } from "./auth.interface";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import config from "../../config";
// import { string } from "zod";
import { createToken } from "./auth.utils";
import { sendEmail } from "../../utils/sendEmail";

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
  const accessToken = createToken(
    jwtpayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );
  const refreshToken = createToken(
    jwtpayload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string
  );

  return {
    accessToken,
    refreshToken,
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
      newPasswordChange: false,
      passwordChangeAt: new Date(),
    }
  );
  return null;
};

//refresh token
const refreshToken = async (token: string) => {
  // checking if the given token is valid
  const decoded = jwt.verify(
    token,
    config.jwt_refresh_secret as string
  ) as JwtPayload;

  const { userId, iat } = decoded;

  // checking if the user is exist
  const user = await User.isUserExistsByCustomId(userId);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "This user is not found !");
  }
  // checking if the user is already deleted
  const isDeleted = user?.isDeleted;

  if (isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, "This user is deleted !");
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === "blocked") {
    throw new AppError(httpStatus.FORBIDDEN, "This user is blocked ! !");
  }

  if (
    user.passwordChangeAt &&
    User.isJWTIssuedBeforePasswordChanged(user.passwordChangeAt, iat as number)
  ) {
    throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized !");
  }

  const jwtPayload = {
    userId: user.id,
    role: user.role,
  };

  const accessToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    config.jwt_access_expires_in as string
  );

  return {
    accessToken,
  };
};

const forgetPassword = async (userId: string) => {
  // checking if the user is exist
  const user = await User.isUserExistsByCustomId(userId);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "This user is not found !");
  }
  // checking if the user is already deleted
  const isDeleted = user?.isDeleted;

  if (isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, "This user is deleted !");
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === "blocked") {
    throw new AppError(httpStatus.FORBIDDEN, "This user is blocked ! !");
  }
  const jwtPayload = {
    userId: user.id,
    role: user.role,
  };

  const resetToken = createToken(
    jwtPayload,
    config.jwt_access_secret as string,
    "10m"
  );

  const resetUILink = `${config.reset_pass_ui_link}?id=${user?.id}&token=${resetToken}`;
  sendEmail(user?.email, resetUILink);

  // console.log(resetUILink);
};

const resetPassword = async (
  payload: { id: string; newPassword: string },
  token: string
) => {
  const user = await User.isUserExistsByCustomId(payload?.id);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "This user is not found !");
  }
  // checking if the user is already deleted
  const isDeleted = user?.isDeleted;

  if (isDeleted) {
    throw new AppError(httpStatus.FORBIDDEN, "This user is deleted !");
  }

  // checking if the user is blocked
  const userStatus = user?.status;

  if (userStatus === "blocked") {
    throw new AppError(httpStatus.FORBIDDEN, "This user is blocked ! !");
  }
  const decoded = jwt.verify(
    token,
    config.jwt_access_secret as string
  ) as JwtPayload;

  if (decoded?.userId !== payload?.id) {
    throw new AppError(httpStatus.FORBIDDEN, "you are forbidden");
  }

  const newHashedPassword = await bcrypt.hash(
    payload.newPassword,
    Number(config.bcrypt_salt_rounds)
  );
  const result = await User.findOneAndUpdate(
    {
      id: payload.id,
      role: user.role,
    },

    {
      password: newHashedPassword,
      newPasswordChange: false,
      passwordChangeAt: new Date(),
    },
    {
      new: true,
    }
  );

  console.log(newHashedPassword);

  return result;
};

export const AuthServices = {
  logInUser,
  changePassword,
  refreshToken,
  forgetPassword,
  resetPassword,
};
