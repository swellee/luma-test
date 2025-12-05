import { message } from "antd";
import { apiHost, router_login } from "./consts";

type HttpOptions = {
  method: "POST" | "GET" | "PUT" | "DELETE";
  params?: Record<string, any>;
  data?: Record<string, any> | FormData;
  headers?: Record<string, string>;
};

export const http = async <T>(
  apiPath: string,
  options: HttpOptions = { method: "GET" },
  logoutOnAuthError = true
): Promise<T> => {
  if (!apiHost) {
    throw new Error("API_URL is not set");
  }
  const token = localStorage.getItem("token");
  const url = new URL(apiPath, apiHost);
  if (options.params) {
    // 过滤掉 undefined 或 null 的字段
    const filteredParams = Object.fromEntries(
      Object.entries(options.params).filter(([_, value]) => value !== null && value !== undefined)
    );
    url.search = new URLSearchParams(filteredParams).toString();
  }

  const isFormData = options.data instanceof FormData;

  const res = await fetch(url, {
    ...options,
    body: options.data
      ? isFormData
        ? (options.data as FormData)
        : JSON.stringify(options.data)
      : undefined,
    headers: {
      ...(options.headers || {
        Authorization: `Bearer ${token}`,
      }),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  });

  const response = await res.json();
  if (response.code !== 200) {
    if (response.code === 401) {
      localStorage.removeItem("token");
      if (logoutOnAuthError) {
        window.location.href = router_login;
      }
    }
    message.error(response.message);
    throw new Error(response.message);
  }
  return response.data as T;
};
