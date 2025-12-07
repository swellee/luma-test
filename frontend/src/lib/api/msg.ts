import { http } from "../http";
import { SysMsgListRes, SysMsgUnreadCountRes, CommonRes } from "../types";

export const msg = {
  getSysMsgList(
    params: {
      status?: "read" | "unread";
      page?: number;
      page_size?: number;
    } = { page: 1, page_size: 10 }
  ) {
    return http<SysMsgListRes>("/sysmsg/list", { params, method: "GET" });
  },
  getSysMsgUnreadCount() {
    return http<SysMsgUnreadCountRes>("/sysmsg/unread", { method: "GET" });
  },
  markSysMsgAsRead(data: { ids?: number[]; all?: string }) {
    return http<CommonRes>("/sysmsg/read", {
      method: "PUT",
      data,
    });
  },
  markAllRead() {
    return http<CommonRes>("/sysmsg/read/all", { method: "PUT" });
  },
};
