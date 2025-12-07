import { api } from "@/lib/api";
import { useRequest } from "ahooks";
import {
  Button,
  Tooltip,
  message,
  Card,
  Tag,
  List,
  Spin,
  Slider,
  Divider,
  Typography,
  Modal,
  Rate,
} from "antd";
import circleIcon from "../assets/circle.svg";
import rectIcon from "../assets/rectangle.svg";
import polyIcon from "../assets/polygon.svg";
import { useState, useEffect, useRef } from "react";
import {
  LeftOutlined,
  RightOutlined,
  DeleteOutlined,
  SaveOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";
import Konva from "konva";
import { KonvaEventListener, KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import {
  MarkData,
  ReviewAnnotationReq,
  SavedAnnotation,
  TaskStatus,
} from "@/lib/types";
import TextArea from "antd/es/input/TextArea";
import { cn } from "@/lib/util";
import {
  FinishAnnotateModal,
  useFinishAnnotateModal,
} from "./finish_annotate_modal";
import { FinishReviewModal, useFinishReviewModal } from "./finish_review_modal";
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
  const [marks, setMarks] = useState<MarkData[]>([]);
  const [reviewInfo, setReviewInfo] = useState<ReviewAnnotationReq>({
    score: 0,
    comment: "",
    annotationId: 0,
  });
  const [loading, setLoading] = useState(false);
  const [preloading, setPreloading] = useState(false);
  // 缩放状态
  const [scale, setScale] = useState(1);
  const [scaleStep] = useState(0.1);
  const [minScale] = useState(0.1);
  const [maxScale] = useState(5);

  // Konva 相关引用
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const imageLayerRef = useRef<Konva.Layer>(null);
  const drawLayerRef = useRef<Konva.Layer>(null);
  const tempShapeRef = useRef<Konva.Shape>(null);
  const bgImageRef = useRef<Konva.Image>(null);
  const transformRef = useRef<Konva.Transformer>(null);

  // 工具状态
  const tool = useRef<"circle" | "rect" | "polygon">(null);
  const linePivots = useRef<Konva.Circle[]>([]);
  const lineEnding = useRef(false);
  const [curTool, setCurTool] = useState<"circle" | "rect" | "polygon" | null>(
    null
  );

  // 绘图状态
  const drawing = useRef(false);
  const startPos = useRef<Vector2d>({ x: 0, y: 0 });

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

  // 初始化 Konva
  useEffect(() => {
    if (!stageContainerRef.current) return;

    const stage = new Konva.Stage({
      container: stageContainerRef.current,
      width: stageContainerRef.current.clientWidth,
      height: stageContainerRef.current.clientHeight,
      draggable: true,
    });
    stageRef.current = stage;

    const imageLayer = new Konva.Layer();
    stage.add(imageLayer);
    imageLayerRef.current = imageLayer;

    const drawLayer = new Konva.Layer();
    stage.add(drawLayer);
    drawLayerRef.current = drawLayer;

    const transformer = new Konva.Transformer();
    drawLayer.add(transformer);
    transformRef.current = transformer;
    stage.on("pointerclick", handleClick);

    // 添加鼠标滚轮缩放事件
    stageContainerRef.current.addEventListener("wheel", handleWheel);

    return () => {
      if (stageRef.current) {
        stageRef.current.destroy();
      }
      if (stageContainerRef.current) {
        stageContainerRef.current.removeEventListener("wheel", handleWheel);
      }
    };
  }, []);

  const handleClick: KonvaEventListener<Konva.Stage, any> = (e) => {
    if (!tool.current) return;

    if (drawing.current) {
      if (tool.current === "polygon") {
        if (lineEnding.current) {
          handleEndDrawLine(e);
        } else {
          const pos = getRelativePosition()!;

          drawLine(pos);
        }
      } else {
        handleEndDraw(e);
      }
    } else if (tool.current) {
      handleStartDraw(e);
    }
  };

  const getRelativePosition = () => {
    const stage = stageRef.current!;
    const pos = stage.getPointerPosition()!;

    if (!pos) return { x: 0, y: 0 };

    // 获取 stage 的当前变换（缩放和位移）
    const stageScale = stage.scaleX();
    const stagePosition = stage.position();

    // 获取背景图片的位置
    const bgImage = bgImageRef.current;
    const bgImagePosition = bgImage ? bgImage.position() : { x: 0, y: 0 };

    // 计算相对于原始图片的坐标
    // 1. 减去 stage 的位移
    // 2. 除以缩放比例
    // 3. 减去背景图片的位移
    const relativePos = {
      x: (pos.x - stagePosition.x) / stageScale - bgImagePosition.x,
      y: (pos.y - stagePosition.y) / stageScale - bgImagePosition.y,
    };

    console.log("Relative position calculation:", {
      mousePos: pos,
      stageScale,
      stagePosition,
      bgImagePosition,
      relativePos,
    });

    return relativePos;
  };
  const handleStartDraw = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!tool.current) return;
    drawing.current = true;
    const stage = e.target.getStage()!;
    const pos = getRelativePosition(); //stage.getPointerPosition()!;
    startPos.current = pos;
    if (tool.current === "polygon") {
      drawLine(pos);
    } else {
      stage.on("pointermove", handleUpdateDraw);
    }
  };
  const handleUpdateDraw: KonvaEventListener<Konva.Stage, any> = (e) => {
    console.log("update draw", tool, drawing.current);
    if (!tool.current || !drawing.current) return;
    const pos = getRelativePosition();
    switch (tool.current) {
      case "circle":
        drawCircle(pos);
        break;
      case "rect":
        drawRect(pos);
        break;
    }
  };
  const handleEndDraw = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!tool.current || !drawing.current) return;
    drawing.current = false;
    const stage = stageRef.current!;
    stage.off("pointermove", handleUpdateDraw);

    const shape = tempShapeRef.current;
    if (shape) {
      // 获取形状数据并添加到 marks 列表
      const markData = extractMarkData(shape, tool.current!);
      if (markData) {
        setMarks((prev) => [...prev, markData]);
      }

      // allow edit
      shape.on("pointerover", handleShapeMouseOver);
      // shape?.on("pointerclick", handleShapeClick);
    }

    tempShapeRef.current = null;
  };

  const handleShapeMouseOver: KonvaEventListener<Konva.Shape, any> = (e) => {
    const shape: Konva.Shape = e.target as Konva.Shape;
    shape.strokeWidth(4);
    shape.on("pointerout", handleShapeMouseOut);
  };
  const handleShapeMouseOut: KonvaEventListener<Konva.Shape, any> = (e) => {
    const shape = e.target as Konva.Shape;
    shape.strokeWidth(2);
  };

  const handleShapeClick: KonvaEventListener<Konva.Shape, any> = (e) => {
    e.cancelBubble = true;
  };

  const drawCircle = (pos: Konva.Vector2d) => {
    if (tempShapeRef.current) {
      tempShapeRef.current.destroy();
    }
    tempShapeRef.current = new Konva.Circle({
      x: startPos.current.x,
      y: startPos.current.y,
      radius: Math.sqrt(
        Math.pow(pos.x - startPos.current.x, 2) +
          Math.pow(pos.y - startPos.current.y, 2)
      ),
      stroke: "red",
      strokeWidth: 2,
      draggable: true,
      fill: "rgba(255, 0, 0, 0.3)",
    });
    drawLayerRef.current?.add(tempShapeRef.current);
    drawLayerRef.current?.batchDraw();
  };

  const drawRect = (pos: Konva.Vector2d) => {
    if (tempShapeRef.current) {
      tempShapeRef.current.destroy();
    }
    tempShapeRef.current = new Konva.Rect({
      x: Math.min(startPos.current.x, pos.x),
      y: Math.min(startPos.current.y, pos.y),
      width: Math.abs(pos.x - startPos.current.x),
      height: Math.abs(pos.y - startPos.current.y),
      draggable: true,
      stroke: "red",
      strokeWidth: 2,
      fill: "rgba(255, 0, 0, 0.3)",
    });
    drawLayerRef.current?.add(tempShapeRef.current);
    drawLayerRef.current?.batchDraw();
  };

  const drawLine = (pos: Konva.Vector2d) => {
    let line = tempShapeRef.current as Konva.Line;
    if (!line) {
      line = tempShapeRef.current = new Konva.Line({
        points: [startPos.current.x, startPos.current.y],
        stroke: "red",
        strokeWidth: 2,
        fill: "rgba(255, 0, 0, 0.3)",
        draggable: true,
      });
      drawLayerRef.current?.add(line);
    }

    const isFirstPoint = linePivots.current.length === 0;
    const pivot = new Konva.Circle({
      x: pos.x,
      y: pos.y,
      radius: isFirstPoint ? 6 : 4,
      fill: isFirstPoint ? "blue" : "white",
      stroke: "grey",
      strokeWidth: 1,
      draggable: true,
    });

    // first pivot add close click event
    if (isFirstPoint) {
      pivot.on("pointerover", (e) => {
        lineEnding.current = true;
        pivot.fill("red");
        drawLayerRef.current?.batchDraw();
      });
      pivot.on("pointerout", (e) => {
        pivot.fill("blue");
        lineEnding.current = false;
        drawLayerRef.current?.batchDraw();
      });
    }

    console.log("draw line at position:", pos);
    linePivots.current.push(pivot);
    drawLayerRef.current?.add(pivot);

    // 更新线的点
    const points = linePivots.current.flatMap((p) => [p.x(), p.y()]);
    line.points(points);

    drawLayerRef.current?.batchDraw();
  };

  const handleEndDrawLine = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const line = tempShapeRef.current as Konva.Line;
    lineEnding.current = false;
    if (line.points().length > 4) {
      line.closed(true);
      linePivots.current.forEach((element) => {
        element.destroy();
      });
      linePivots.current = [];
    }
    handleEndDraw(e);
  };
  // 应用缩放
  useEffect(() => {
    if (!stageRef.current || !imageLayerRef.current) return;

    // 获取舞台中心点
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    // 设置新的缩放比例
    stage.scale({ x: scale, y: scale });

    // 调整位置以保持鼠标位置不变
    const newPos = {
      x: pointer.x - mousePointTo.x * scale,
      y: pointer.y - mousePointTo.y * scale,
    };

    stage.position(newPos);
    stage.batchDraw();
  }, [scale]);

  // 加载当前图片和标注数据
  useEffect(() => {
    if (
      bucketInfo &&
      list.length > 0 &&
      currentIndex < list.length &&
      drawLayerRef.current
    ) {
      loadCurrentImage();
      loadSavedAnnotation();
    }
  }, [bucketInfo, currentIndex, list, drawLayerRef.current]);

  // 预加载下一张图片
  useEffect(() => {
    if (bucketInfo && list.length > 0 && currentIndex < list.length - 1) {
      preloadNextImage();
    }
  }, [bucketInfo, currentIndex, list]);

  const loadCurrentImage = async () => {
    if (!bucketInfo || list.length === 0) return;

    setLoading(true);
    try {
      const currentKey = list[currentIndex];
      const imageUrl = await getS3ImageUrl(currentKey);

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        if (imageLayerRef.current) {
          imageLayerRef.current.destroyChildren();
        }
        const konvaImage = (bgImageRef.current = new Konva.Image({
          image: img,
          x: 0,
          y: 0,
          name: "bgImg",
          // width: stageRef.current.width(),
          // height: stageRef.current.height(),
        }));

        if (imageLayerRef.current) {
          imageLayerRef.current.add(konvaImage);
          imageLayerRef.current.draw();
        }

        setLoading(false);
        linePivots.current.length = 0;
      };

      img.onerror = () => {
        message.error(`图片加载失败: ${currentKey}`);
        setLoading(false);
      };

      img.src = imageUrl;
    } catch (error) {
      console.error("加载图片失败:", error);
      message.error("加载图片失败");
      setLoading(false);
    }
  };

  const preloadNextImage = async () => {
    if (!bucketInfo || currentIndex >= list.length - 1) return;

    setPreloading(true);
    try {
      const nextKey = list[currentIndex + 1];
      const imageUrl = await getS3ImageUrl(nextKey);

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        setPreloading(false);
      };

      img.onerror = () => {
        setPreloading(false);
      };

      img.src = imageUrl;
    } catch (error) {
      console.error("预加载图片失败:", error);
      setPreloading(false);
    }
  };

  const getS3ImageUrl = async (key: string): Promise<string> => {
    //test
    return "https://gips1.baidu.com/it/u=1647344915,1746921568&fm=3028&app=3028&f=JPEG&fmt=auto?w=720&h=1280";
    // if (!bucketInfo) throw new Error('Bucket 信息未加载');
    // return await api.bucket.getObjectUrl(bucketInfo, key);
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
        setReviewInfo({
          annotationId: response.id!,
          score: response.review?.score ?? 0,
          comment: response.review?.comment ?? "",
        });
      }
      if (response && response.meta && response.meta.marks) {
        // 设置 marks 状态
        setMarks(response.meta.marks);
        // 重新绘制标记
        redrawMarks(response.meta.marks);
        // message.success(`已加载 ${response.meta.marks.length} 个标记`);
      }
    } catch (error: any) {
      // 404 错误表示没有保存的标注，这是正常情况
      if (error.response && error.response.status === 404) {
        console.log(`图片 ${currentKey} 没有保存的标注数据`);
      } else {
        console.error("加载标注数据失败:", error);
      }
      setMarks([]);
      redrawMarks([]);
    }
  };

  // 处理鼠标滚轮缩放
  const handleWheel = (e: WheelEvent) => {
    e.preventDefault();

    if (viewMode || loading) return;

    const delta = e.deltaY > 0 ? -scaleStep : scaleStep;
    const newScale = Math.max(minScale, Math.min(maxScale, scale + delta));

    setScale(parseFloat(newScale.toFixed(2)));
  };

  // 处理 Slider 变化
  const handleSliderChange = (value: number) => {
    setScale(value);
  };

  // 放大
  const zoomIn = () => {
    const newScale = Math.max(minScale, Math.min(maxScale, scale + scaleStep));
    setScale(parseFloat(newScale.toFixed(2)));
  };

  // 缩小
  const zoomOut = () => {
    const newScale = Math.max(minScale, Math.min(maxScale, scale - scaleStep));
    setScale(parseFloat(newScale.toFixed(2)));
  };

  // 重置缩放
  const resetZoom = () => {
    setScale(1);
  };

  // 从 Konva 形状提取标记数据（保存相对坐标）
  const extractMarkData = (
    shape: any,
    type: "circle" | "rect" | "polygon"
  ): MarkData | null => {
    try {
      const color = "#ff0000"; // 默认红色
      const text = `${type.charAt(0).toUpperCase() + type.slice(1)} ${
        marks.length + 1
      }`;

      // 注意：这里保存的是相对坐标（相对于背景图片）
      // 这些坐标已经通过 getRelativePosition() 计算得到
      switch (type) {
        case "circle": {
          const circle = shape as Konva.Circle;
          return {
            type: "circle",
            data: {
              x: circle.x(), // 相对坐标
              y: circle.y(), // 相对坐标
              radius: circle.radius(),
              color,
              text,
            },
          };
        }
        case "rect": {
          const rect = shape as Konva.Rect;
          return {
            type: "rect",
            data: {
              x: rect.x(), // 相对坐标
              y: rect.y(), // 相对坐标
              width: rect.width(),
              height: rect.height(),
              color,
              text,
            },
          };
        }
        case "polygon": {
          const line = shape as Konva.Line;
          const points = line.points();
          const pointObjects = [];
          for (let i = 0; i < points.length; i += 2) {
            pointObjects.push({
              x: points[i], // 相对坐标
              y: points[i + 1], // 相对坐标
            });
          }
          return {
            type: "polygon",
            data: {
              points: pointObjects,
              color,
              text,
            },
          };
        }
        default:
          return null;
      }
    } catch (error) {
      console.error("Error extracting mark data:", error);
      return null;
    }
  };

  const removeMark = (index: number) => {
    const newMarks = [...marks];
    newMarks.splice(index, 1);
    setMarks(newMarks);
    redrawMarks(newMarks);
  };

  const redrawMarks = (marksToDraw: MarkData[]) => {
    if (!drawLayerRef.current) return;

    drawLayerRef.current.destroyChildren();

    marksToDraw.forEach((mark) => {
      if (mark.type === "circle") {
        const data = mark.data;
        const circle = new Konva.Circle({
          x: data.x,
          y: data.y,
          radius: data.radius,
          fill: `rgba(${parseInt(data.color.slice(1, 3), 16)}, ${parseInt(
            data.color.slice(3, 5),
            16
          )}, ${parseInt(data.color.slice(5, 7), 16)}, 0.3)`,
          stroke: data.color,
          strokeWidth: 2,
          draggable: !viewMode,
        });
        drawLayerRef.current?.add(circle);
      } else if (mark.type === "rect") {
        const data = mark.data;
        const rect = new Konva.Rect({
          x: data.x,
          y: data.y,
          width: data.width,
          height: data.height,
          fill: `rgba(${parseInt(data.color.slice(1, 3), 16)}, ${parseInt(
            data.color.slice(3, 5),
            16
          )}, ${parseInt(data.color.slice(5, 7), 16)}, 0.3)`,
          stroke: data.color,
          strokeWidth: 2,
          draggable: !viewMode,
        });
        drawLayerRef.current?.add(rect);
      } else if (mark.type === "polygon") {
        const data = mark.data;
        const points = data.points.flatMap((p: any) => [p.x, p.y]);
        const polygon = new Konva.Line({
          points: points,
          closed: true,
          fill: `rgba(${parseInt(data.color.slice(1, 3), 16)}, ${parseInt(
            data.color.slice(3, 5),
            16
          )}, ${parseInt(data.color.slice(5, 7), 16)}, 0.3)`,
          stroke: data.color,
          strokeWidth: 2,
          draggable: !viewMode,
        });
        drawLayerRef.current?.add(polygon);
      }
    });

    drawLayerRef.current.batchDraw();
  };

  const handleSaveAndNext = async () => {
    if (viewMode) {
      handleSaveReviewAndNext();
    } else {
      await handleSaveAnnotationAndNext();
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
    message.success("已保存，切换到下一张图片");
  };
  const handleSaveAnnotationAndNext = async () => {
    if (list.length === 0) return;

    const currentKey = list[currentIndex];
    const annotation: SavedAnnotation = {
      key: currentKey,
      taskId: taskId!,
      meta: {
        bucketId,
        marks: [...marks],
      },
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
    message.success("标注已保存，切换到下一张图片");
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

  // 处理标记文本编辑
  const handleMarkTextChange = (index: number, newText: string) => {
    setMarks((prev) => {
      const newMarks = [...prev];
      if (newMarks[index]) {
        newMarks[index] = {
          ...newMarks[index],
          data: {
            ...newMarks[index].data,
            text: newText,
          },
        };
      }
      return newMarks;
    });
  };

  const clearAllMarks = () => {
    setMarks([]);
    linePivots.current.length = 0;
    if (drawLayerRef.current) {
      drawLayerRef.current.destroyChildren();
      drawLayerRef.current.draw();
    }
  };

  const tools = [
    {
      name: "Circle",
      icon: circleIcon,
      tool: "circle" as const,
    },
    {
      name: "Rectangle",
      icon: rectIcon,
      tool: "rect" as const,
    },
    {
      name: "Polygon",
      icon: polyIcon,
      tool: "polygon" as const,
    },
  ];

  return (
    <Spin spinning={loading}>
      <div className="p-4 flex gap-4">
        {/* 左侧工具栏 */}
        {!viewMode && (
          <div className="w-20 rounded-2xl p-4 bg-black/80 flex flex-col gap-4 items-center">
            <h4 className="text-xl">Tools</h4>
            {tools.map((t) => (
              <Tooltip title={t.name} key={t.name} placement="right">
                <Button
                  type={curTool === t.tool ? "primary" : "default"}
                  onClick={() => {
                    tool.current = t.tool;
                    setCurTool(t.tool);
                  }}
                >
                  <img src={t.icon} alt={t.name} width={24} height={24} />
                </Button>
              </Tooltip>
            ))}
            <Divider />
            <h4 style={{ marginBottom: "12px" }}>Clear</h4>
            <Button
              danger
              onClick={clearAllMarks}
              icon={<DeleteOutlined />}
            ></Button>
          </div>
        )}

        {/* 中间画布区域 */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* 画布 */}
          <Card
            title={`图片 ${currentIndex + 1}/${list.length} - ${
              list[currentIndex] || ""
            }`}
            className="flex-1 relative"
            extra={
              <div>
                {description && <Tag color="blue">{description}</Tag>}
                {preloading && <Tag color="orange">预加载中...</Tag>}
              </div>
            }
          >
            <div
              ref={stageContainerRef}
              className="w-full h-[500px] bg-white/90"
            />
            {curTool != null && (
              <div className="animate-pulse absolute z-2 top-16 right-4 h-8 p-4 flex items-center gap-4 bg-black/50">
                <span className="text-green-600">Drawing {tool.current}</span>
                <Button
                  size="small"
                  className=""
                  type="primary"
                  danger
                  onClick={() => {
                    tool.current = null;
                    setCurTool(null);
                  }}
                >
                  End Draw
                </Button>
              </div>
            )}
          </Card>

          {/* 控制栏 */}
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
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

              <div>
                <span style={{ marginRight: "16px" }}>
                  marks: {marks.length}
                </span>
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
        </div>

        {/* 右侧面板 - 标记列表和缩放控制 */}
        <div
          className={cn(
            "w-[220px] flex flex-col gap-4",
          )}
        >
          {!viewMode && (
            <div className="p-4 bg-black rounded-2xl">
              {/* 缩放控制 */}
              <div className="bg-gray-950">
                <div className="flex justify-between items-center">
                  <span className="text-xl text-green-700">
                    zoom: {scale.toFixed(2)}x
                  </span>
                  <Button onClick={resetZoom} size="small">
                    reset
                  </Button>
                </div>

                <div className="flex gap-2 items-center justify-between">
                  <Button
                    icon={<ZoomOutOutlined />}
                    onClick={zoomOut}
                    size="small"
                    disabled={scale <= minScale}
                  />
                  <Slider
                    min={minScale}
                    max={maxScale}
                    step={scaleStep}
                    value={scale}
                    onChange={handleSliderChange}
                    style={{ flex: 1 }}
                    tooltip={{ formatter: (value) => `${value?.toFixed(2)}x` }}
                  />
                  <Button
                    icon={<ZoomInOutlined />}
                    onClick={zoomIn}
                    size="small"
                    disabled={scale >= maxScale}
                  />
                </div>
              </div>

              <div
                style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}
              >
                <div>• 鼠标悬停在画布上使用滚轮缩放</div>
                <div>• 或使用滑块/按钮控制</div>
              </div>
            </div>
          )}

          {/* 标记列表 */}
          <div className="overflow-y-auto bg-black/90 flex-1 p-4 rounded-2xl">
            <h4 className="text-xl text-green-700">Marks</h4>
            {marks.length === 0 ? (
              <div
                style={{
                  color: "#999",
                  textAlign: "center",
                  padding: "24px",
                }}
              >
                No Marks yet
              </div>
            ) : (
              <div style={{ height: "300px", overflowY: "auto" }}>
                <List
                  dataSource={marks}
                  renderItem={(mark, index) => (
                    <List.Item
                      actions={[
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          disabled={viewMode}
                          onClick={() => removeMark(index)}
                        />,
                      ]}
                      style={{ padding: "8px 0" }}
                    >
                      <List.Item.Meta
                        title={
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius:
                                  mark.type === "circle"
                                    ? "50%"
                                    : mark.type === "rect"
                                    ? "0"
                                    : "2px",
                                backgroundColor: mark.data.color,
                              }}
                            />
                            <Typography.Text
                              editable={
                                !viewMode && {
                                  onChange: (text) =>
                                    handleMarkTextChange(index, text),
                                  tooltip: "点击编辑文本",
                                  maxLength: 50,
                                  autoSize: { minRows: 1, maxRows: 2 },
                                }
                              }
                              style={{ fontSize: "13px" }}
                            >
                              {mark.data.text}
                            </Typography.Text>
                          </div>
                        }
                        description={
                          <div style={{ fontSize: "11px", color: "#666" }}>
                            类型: {mark.type}
                            {mark.type === "circle" &&
                              ` | 半径: ${mark.data.radius.toFixed(1)}`}
                            {mark.type === "rect" &&
                              ` | 尺寸: ${mark.data.width.toFixed(
                                1
                              )}×${mark.data.height.toFixed(1)}`}
                            {mark.type === "polygon" &&
                              ` | 点数: ${mark.data.points.length}`}
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </div>
            )}
          </div>
          {
            reviewInfo?.score>0 && (
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
          ) 
          }
        </div>
      </div>
      <FinishAnnotateModal {...finishAnnotaeModalProps} />
      <FinishReviewModal {...finishReviewModalProps} />
    </Spin>
  );
};
