import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { TaskStatus } from "./types";
import { Tag } from "antd";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getStatusTag(status: TaskStatus) {
  const statusConfig: Record<TaskStatus, { color: string; text: string }> = {
    [TaskStatus.created]: { color: "blue", text: "Created" },
    [TaskStatus.processing]: { color: "orange", text: "Processing" },
    [TaskStatus.processed]: { color: "purple", text: "Processed" },
    [TaskStatus.reviewing]: { color: "orange", text: "Reviewing" },
    [TaskStatus.approved]: { color: "green", text: "Approved" },
    [TaskStatus.rejected]: { color: "red", text: "Rejected" },
  };
  const config = statusConfig[status];
  return <Tag color={config.color}>{config.text}</Tag>;
}
