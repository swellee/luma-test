import { api } from "@/lib/api";
import { useRequest } from "ahooks";
import { Button, message, Card, Tag, Rate, Checkbox } from "antd";
import { useState, useEffect, useRef, useMemo, cache } from "react";
import { LeftOutlined, RightOutlined, SaveOutlined } from "@ant-design/icons";
import { ReviewAnnotationReq, SavedAnnotation, TaskStatus } from "@/lib/types";
import { cacheTool, getFileType } from "@/lib/util";
import {
  FinishAnnotateModal,
  useFinishAnnotateModal,
} from "../finish_annotate_modal";
import {
  FinishReviewModal,
  useFinishReviewModal,
} from "../finish_review_modal";
import { AnnonateImg } from "./annonate_img";
import TextArea from "antd/es/input/TextArea";
import { AnnonateVideo } from "./annonate_video";
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

export const AnnonatePanel = ({
  bucketId,
  current = 0,
  list,
  viewMode = false,
  description,
  taskId,
  onSaveAnnotation,
  onSaveReview,
  onCompleteAnnotate,
  onCompleteReview,
}: AnnonatePanelProps) => {
  const [currentIndex, setCurrentIndex] = useState(current);
  const [currentUrl, setCurrentUrl] = useState("");
  const [nextUrl, setNextUrl] = useState("");
  const [curAnnotation, setCurAnnotation] = useState<SavedAnnotation>();
  // 标记数据状态
  const [reviewInfo, setReviewInfo] = useState<ReviewAnnotationReq>({
    score: 0,
    comment: "",
    annotationId: 0,
  });
  const [testImg, setTestImg] = useState(false);
  const [currentIsImg, setCurrentIsImg] = useState(true);
  const annotateImgRef = useRef<any>(null);
  const annotateVideoRef = useRef<any>(null);

  const { data: bucketInfo } = useRequest(
    async () => {
      const res = await api.bucket.getBucket(bucketId);
      return res;
    },
    {
      ready: bucketId > 0,
      refreshDeps: [bucketId],
    }
  );

  // 加载当前图片和标注数据
  useEffect(() => {
    if (bucketInfo && list.length > 0 && currentIndex < list.length) {
      loadCurrentSource();
      loadSavedAnnotation();
    }
  }, [bucketInfo, currentIndex, list]);

  // 预加载下一张图片
  useEffect(() => {
    if (bucketInfo && list.length > 0 && currentIndex < list.length - 1) {
      preloadNextSource();
    }
  }, [bucketInfo, currentIndex, list]);

  const loadCurrentSource = async () => {
    if (!bucketInfo || list.length === 0) return;

    try {
      const currentKey = list[currentIndex];
      setCurrentIsImg(getFileType(currentKey) === "image");
      const imageUrl = await getS3ObjUrl(currentKey);
      setCurrentUrl(imageUrl);
    } catch (error) {
      console.error("Error loading s3 object url:", error);
    }
  };
  // 加载已保存的标注数据
  const loadSavedAnnotation = async () => {
    if (!taskId || list.length === 0 || currentIndex >= list.length) {
      return;
    }
    const currentKey = list[currentIndex];
    try {
      const response = await api.task.getAnnotation(taskId, currentKey);
      if (response) {
        setCurAnnotation(response);
        setReviewInfo({
          annotationId: response.id!,
          score: response.review?.score ?? 0,
          comment: response.review?.comment ?? "",
        });
      }
    } catch (error: any) {
      // 404 错误表示没有保存的标注，这是正常情况
      if (error.response && error.response.status === 404) {
        console.log(`图片 ${currentKey} 没有保存的标注数据`);
      } else {
        console.error("加载标注数据失败:", error);
      }
      setCurAnnotation(undefined);
      setReviewInfo({
        annotationId: 0,
        score: 0,
        comment: "",
      });
    }
  };

  const preloadNextSource = async () => {
    if (!bucketInfo || currentIndex >= list.length - 1) return;
    try {
      const nextKey = list[currentIndex + 1];
      const imageUrl = await getS3ObjUrl(nextKey);
      setNextUrl(imageUrl);
    } catch (error) {
      console.error("预加载图片失败:", error);
    }
  };

  const getS3ObjUrl = async (key: string): Promise<string> => {
    const fileType = getFileType(key);
    if (testImg) {
      return fileType === "image"
        ? "https://gips1.baidu.com/it/u=1647344915,1746921568&fm=3028&app=3028&f=JPEG&fmt=auto?w=720&h=1280"
        : "https://vjs.zencdn.net/v/oceans.mp4";
    } else {
      if (!bucketInfo) throw new Error("Bucket 信息未加载");
      const cachedUrl = cacheTool.get(key);
      if(cachedUrl) return cachedUrl;
      const url = await api.bucket.getObjectUrl(bucketInfo, key);
      cacheTool.set(key, url);
      return url;
    }
  };

  const finishAnnotaeModalProps = useFinishAnnotateModal(() => {
    if (onCompleteAnnotate) {
      onCompleteAnnotate(taskId!);
    }
  });
  const finishReviewModalProps = useFinishReviewModal((status) => {
    if (onCompleteReview) {
      onCompleteReview(status!);
    }
  });
  const handleSaveAndNext = async () => {
    if (viewMode) {
      handleSaveReviewAndNext();
    } else {
      await handleSaveAnnotationAndNext();
      annotateImgRef.current.clearMarks();
      annotateVideoRef.current.clearMarks();
    }
  };

  const handleSaveReviewAndNext = async () => {
    if (!reviewInfo.score) {
      message.error("Please fill out the review rate star");
      return;
    }
    await onSaveReview?.(reviewInfo);

    // 如果是最后一张图片，提示是否完成任务
    if (currentIndex === list.length - 1) {
      finishReviewModalProps.open();
      return;
    }

    // 不是最后一张，切换到下一张
    setCurrentIndex((prev) => prev + 1);
    message.success("saved and next");
  };
  const handleSaveAnnotationAndNext = async () => {
    if (list.length === 0) return;

    const currentKey = list[currentIndex];
    const annotation: SavedAnnotation = {
      key: currentKey,
      taskId: taskId!,
      meta: currentIsImg
        ? annotateImgRef.current.getAnnotationMeta(bucketId)
        : annotateVideoRef.current.getAnnotationMeta(bucketId),
    };

    // 保存当前标注
    if (onSaveAnnotation) {
      onSaveAnnotation(annotation);
    }

    // 如果是最后一张图片，提示是否完成任务
    if (currentIndex === list.length - 1) {
      finishAnnotaeModalProps.open();
      return;
    }

    // 不是最后一张，切换到下一张
    setCurrentIndex((prev) => prev + 1);
    message.success("saved and next");
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < list.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const reivewComp = useMemo(
    () =>
      viewMode && (
        <div className="p-4 bg-black rounded-2xl">
          <h3 className="text-xl text-green-700">Review Info</h3>
          <Rate
            value={reviewInfo.score}
            onChange={(v) => setReviewInfo({ ...reviewInfo, score: v })}
            disabled={!viewMode}
          />
          <TextArea
            value={reviewInfo.comment}
            autoSize={{ minRows: 3 }}
            onChange={(e) =>
              setReviewInfo({
                ...reviewInfo,
                comment: e.target.value.trim(),
              })
            }
            disabled={!viewMode}
            placeholder="type your comment here"
          />
        </div>
      ),
    [reviewInfo, viewMode]
  );
  return (
    <div className="p-4 flex-1 flex flex-col gap-4">
      {currentIsImg ? (
        <AnnonateImg
          ref={annotateImgRef}
          reviewComp={reivewComp}
          viewMode={viewMode}
          curAnnotation={curAnnotation}
          currentUrl={currentUrl}
          nextUrl={nextUrl}
        />
      ) : (
        <AnnonateVideo
          ref={annotateVideoRef}
          reviewComp={reivewComp}
          viewMode={viewMode}
          curAnnotation={curAnnotation}
          currentUrl={currentUrl}
          nextUrl={nextUrl}
        />
      )}
      {/* 控制栏 */}
      <Card className="shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <Button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              icon={<LeftOutlined />}
            >
              prev
            </Button>
            <span style={{ margin: "0 16px" }}>
              {currentIndex + 1} / {list.length}
            </span>
            <Button
              onClick={handleNext}
              disabled={currentIndex === list.length - 1}
              icon={<RightOutlined />}
            >
              next
            </Button>
          </div>
          <div className="info">
            <div className="text-xs text-gray-400">
               Resource:{list[currentIndex] || ""}
            </div>
            <div>
              {description && (
                <span className="text-orange-400">
                  Requirement:<Tag color="blue">{description}</Tag>
                </span>
              )}
            </div>
          </div>
          <div>
            <Button
              type="primary"
              onClick={handleSaveAndNext}
              icon={<SaveOutlined />}
            >
              save & {currentIndex === list.length - 1 ? "finish" : "next"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="absolute top-16 right-6">
        s3 资源加载不了？
        <Checkbox
          checked={testImg}
          onChange={(e) => setTestImg(e.target.checked)}
        >
          使用测试资源
        </Checkbox>
      </div>

      <FinishAnnotateModal {...finishAnnotaeModalProps} />
      <FinishReviewModal {...finishReviewModalProps} />
    </div>
  );
};
