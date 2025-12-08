import { ReviewAnnotationReq, SavedAnnotation, TaskStatus } from "@/lib/types";

export interface AnnonatePanelProps {
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
export interface AnnotateComp {
  getAnnotationMeta: (bucketId: number) => SavedAnnotation["meta"];
  clearMarks: () => void;
}
