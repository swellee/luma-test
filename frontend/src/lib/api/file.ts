import { http } from "../http";
import { FileUploadRes, CommonRes } from "../types";

export const fileApi = {
  uploadFile(file: File, dir = "/"): Promise<FileUploadRes> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("dir", dir);
    return http("/file", { method: "POST", data: formData });
  },
  deleteFile(key: string): Promise<CommonRes> {
    return http("/file", { method: "DELETE", params: { key } });
  },
};
