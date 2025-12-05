import { http } from "../http";
import md5 from "md5";

import { CommonRes, User, UserCreateReq, UserListRes, UserLoginRes, UserUpdateReq } from "../types";

export const user = {
  sendVerifyCode(email: string, for_register = false): Promise<CommonRes> {
    return http("/user/send-code", {
      method: "POST",
      data: { email, for_register },
    });
  },
  checkVerifyCode(email: string, code: string): Promise<CommonRes> {
    return http("/user/verify-code", {
      method: "POST",
      data: { email, code },
    });
  },
  register(data: UserCreateReq ): Promise<UserLoginRes> {
    return http("/user/register", {
      method: "POST",
      data: { ...data, password: md5(data.password) },
    });
  },
  login(data: { email: string; password: string }): Promise<UserLoginRes> {
    return http<UserLoginRes>("/user/login", {
      method: "POST",
      data: { ...data, password: md5(data.password) },
    });
  },
  // 请求重置密码验证码
  requestPasswordReset(data: { email: string }): Promise<CommonRes> {
    return http<CommonRes>("/user/password/forget", {
      method: "POST",
      data,
    });
  },
  // 验证验证码并重置密码
  verifyCodeAndResetPassword(data: {
    email: string;
    code: string;
    new_password: string;
  }): Promise<CommonRes> {
    return http<CommonRes>("/user/password/reset", {
      method: "POST",
      data: { ...data, new_password: md5(data.new_password) },
    });
  },
  getProfile(): Promise<User> {
    return http("/user/profile");
  },
  updateProfile(
    data: UserUpdateReq,
  ): Promise<User> {
    return http<User>("/user/profile", {
      method: "PUT",
      data,
    });
  },

  getUserList(page: number, page_size: number) {
    return http<UserListRes>("/user/list", {
      method: "GET",
      params: { page, page_size },
    });
  }
};
