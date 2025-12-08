import { SavedAnnotation, ReviewAnnotationReq, TaskStatus } from "@/lib/types";
import { forwardRef } from "react";
import { AnnotateComp } from "./shared";

interface AnnonatePanelProps {
  bucketId: number;
  list: string[]; // list of s3 object keys
  current?: number; // current index of the list
  viewMode?: boolean; // hide toolbar if true
  description?: string;
  taskId?: number; // 新增：任务ID
  onSaveAnnotation?: (annotation: SavedAnnotation) => void; // 修改：保存单个标注
  onSaveReview?: (annotation: ReviewAnnotationReq) => void; // 修改：保存单个标注review
  onCompleteAnnotate?: (taskId: number) => Promise<void>; // 新增：完成标注任务
  onCompleteReview?: (status: TaskStatus) => Promise<void>; // 新增：完成审核任务
}

interface AnnonateVideoProps {
  viewMode?: boolean;
  currentUrl?: string;
  nextUrl?: string;
  curAnnotation?: SavedAnnotation;
  reviewComp?: React.ReactNode;
}

export const AnnonateVideo = forwardRef(
  (
    {
      viewMode,
      curAnnotation,
      reviewComp,
      currentUrl,
      nextUrl,
    }: AnnonateVideoProps,
    ref: React.Ref<AnnotateComp>
  ) => {
    return <div>to be implemented</div>;
  }
);
