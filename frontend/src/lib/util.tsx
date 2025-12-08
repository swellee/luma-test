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

// 定义图片和视频扩展名
const imageExtensions = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".webp",
]);
const videoExtensions = new Set([
  ".mp4",
  ".avi",
  ".mov",
  ".wmv",
  ".flv",
  ".mkv",
  ".webm",
]);
export function getFileType(filename: string): "image" | "video" | "unknown" {
  const extension = filename.toLowerCase().split(".").pop();
  if (imageExtensions.has(`.${extension}`)) {
    return "image";
  } else if (videoExtensions.has(`.${extension}`)) {
    return "video";
  } else {
    return "unknown";
  }
}

// LRU Cache 实现
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // 将访问的元素移到最新位置
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // 如果key已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // 如果缓存已满，删除最久未使用的元素（第一个元素）
    else if (this.cache.size >= this.capacity) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    // 添加新元素到最新位置
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cacheTool = new LRUCache<string, any>(50);