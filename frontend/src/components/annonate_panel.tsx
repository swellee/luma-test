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
  Space,
  Slider,
  InputNumber,
  Divider,
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

interface AnnonatePanelProps {
  bucketId: number;
  list: string[]; // list of s3 object keys
  current?: number; // current index of the list
  viewMode?: boolean; // hide toolbar if true
  description?: string;
  onSave?: (annotation: any) => void;
}

// 标记数据类型
interface MarkData {
  type: "rect" | "circle" | "polygon";
  data: any;
}

interface SavedAnnotation {
  key: string;
  meta: {
    bucketId: number;
    marks: MarkData[];
  };
}

export const AnnonatePanel = ({
  bucketId,
  current = 0,
  list,
  viewMode = false,
  description,
  onSave,
}: AnnonatePanelProps) => {
  const [currentIndex, setCurrentIndex] = useState(current);
  const [marks, setMarks] = useState<MarkData[]>([]);
  const [loading, setLoading] = useState(false);
  const [preloading, setPreloading] = useState(false);

  // 缩放状态
  const [scale, setScale] = useState(1);
  const [scaleStep] = useState(0.1);
  const [minScale] = useState(0.1);
  const [maxScale] = useState(5);

  // Konva 相关引用
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const imageLayerRef = useRef<any>(null);
  const drawLayerRef = useRef<any>(null);
  const tempShapeRef = useRef<any>(null);
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

  // 保存状态
  const savedAnnotations = useRef<SavedAnnotation[]>([]);
  const savedAnnotationIndex = useRef(0);

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
          const stage = e.target.getStage()!;
          const pos = stage.getPointerPosition()!;

          drawLine(pos);
        }
      } else {
        handleEndDraw(e);
      }
    } else if (tool.current) {
      handleStartDraw(e);
    } 
  };

  const handleStartDraw = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!tool.current) return;
    drawing.current = true;
    const stage = e.target.getStage()!;
    const pos = stage.getPointerPosition()!;
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
    const stage = e.target.getStage()!;
    const pos = stage.getPointerPosition()!;
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
    // allow edit
    const shape = tempShapeRef.current;
    shape?.on("pointerover", handleShapeMouseOver);
    // shape?.on("click", handleShapeClick);
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
    // todo: 1. add name for each shape after draw; 2.on click shape, show edit panel(name, mark-text,etc); and can be deleted
    // const shape = e.target as Konva.Shape;
    // e.cancelBubble = true;
    // transformRef.current?.nodes([shape]);
    // drawLayerRef.current?.batchDraw();
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

    // firt pivot add close click event
    if (isFirstPoint) {
      pivot.on("pointerover", (e) => {
        lineEnding.current = true;
        pivot.fill("red");
        // drawLayerRef.current?.batchDraw();
      });
      pivot.on("pointerout", (e) => {
        pivot.fill("blue");
        lineEnding.current = false;
        // drawLayerRef.current?.batchDraw();
      });
    }
    console.log("draw line", pivot.position());
    linePivots.current.push(pivot);
    drawLayerRef.current?.add(pivot);
    tempShapeRef.current.points(
      linePivots.current.flatMap((p) => [p.x(), p.y()])
    );
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

  // 加载当前图片
  useEffect(() => {
    if (bucketInfo && list.length > 0 && currentIndex < list.length) {
      loadCurrentImage();
    }
  }, [bucketInfo, currentIndex, list]);

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
        if (drawLayerRef.current) {
          drawLayerRef.current.destroyChildren();
        }

        const konvaImage = new Konva.Image({
          image: img,
          x: 0,
          y: 0,
          name: "bgImg",
          // width: stageRef.current.width(),
          // height: stageRef.current.height(),
        });

        if (imageLayerRef.current) {
          imageLayerRef.current.add(konvaImage);
          imageLayerRef.current.draw();
        }

        setLoading(false);
        setMarks([]);
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

  // 处理 InputNumber 变化
  const handleInputChange = (value: number | null) => {
    if (value !== null) {
      setScale(Math.max(minScale, Math.min(maxScale, value)));
    }
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
        });
        drawLayerRef.current.add(circle);
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
        });
        drawLayerRef.current.add(rect);
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
        });
        drawLayerRef.current.add(polygon);
      }
    });

    drawLayerRef.current.draw();
  };

  const handleSaveAndNext = () => {
    if (list.length === 0) return;

    const currentKey = list[currentIndex];
    const annotation: SavedAnnotation = {
      key: currentKey,
      meta: {
        bucketId,
        marks: [...marks],
      },
    };

    if (onSave) {
      onSave(annotation);
    }

    if (currentIndex === list.length - 1) {
      message.success("标注完成！所有图片已标注完毕。");
      return;
    }

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
                  上一张
                </Button>
                <span style={{ margin: "0 16px" }}>
                  {currentIndex + 1} / {list.length}
                </span>
                <Button
                  onClick={handleNext}
                  disabled={currentIndex === list.length - 1}
                  icon={<RightOutlined />}
                >
                  下一张
                </Button>
              </div>

              <div>
                <span style={{ marginRight: "16px" }}>
                  标记数量: {marks.length}
                </span>
                <Button
                  type="primary"
                  onClick={handleSaveAndNext}
                  icon={<SaveOutlined />}
                  disabled={viewMode}
                >
                  保存并{currentIndex === list.length - 1 ? "完成" : "下一张"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* 右侧面板 - 标记列表和缩放控制 */}
        {!viewMode && (
          <div
            style={{
              width: "250px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {/* 缩放控制 */}
            <div
              style={{
                backgroundColor: "#f5f5f5",
                padding: "16px",
                borderRadius: "8px",
              }}
            >
              <h4 style={{ marginBottom: "16px" }}>缩放控制</h4>
              <div style={{ marginBottom: "16px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span>缩放比例: {scale.toFixed(2)}x</span>
                  <Button type="link" onClick={resetZoom} size="small">
                    重置
                  </Button>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "12px",
                  }}
                >
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

                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontSize: "12px", color: "#666" }}>比例:</span>
                  <InputNumber
                    min={minScale}
                    max={maxScale}
                    step={scaleStep}
                    value={scale}
                    onChange={handleInputChange}
                    size="small"
                    style={{ width: "80px" }}
                    formatter={(value) => `${value}x`}
                    parser={(value) =>
                      value ? parseFloat(value.replace("x", "")) : 1
                    }
                  />
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#666",
                      marginLeft: "auto",
                    }}
                  >
                    {Math.round(scale * 100)}%
                  </span>
                </div>
              </div>

              <div
                style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}
              >
                <div>• 鼠标悬停在画布上使用滚轮缩放</div>
                <div>• 或使用滑块/按钮控制</div>
              </div>
            </div>

            {/* 标记列表 */}
            <div
              style={{
                backgroundColor: "#f5f5f5",
                padding: "16px",
                borderRadius: "8px",
                flex: 1,
                overflow: "hidden",
              }}
            >
              <h4 style={{ marginBottom: "16px" }}>标记列表</h4>
              {marks.length === 0 ? (
                <div
                  style={{
                    color: "#999",
                    textAlign: "center",
                    padding: "24px",
                  }}
                >
                  暂无标记
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
                              <span style={{ fontSize: "13px" }}>
                                {mark.data.text}
                              </span>
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
          </div>
        )}
      </div>
    </Spin>
  );
};
