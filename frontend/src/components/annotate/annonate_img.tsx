import { AnnonatePanelProps, AnnotateComp } from "./shared";
import circleIcon from "../../assets/circle.svg";
import rectIcon from "../../assets/rectangle.svg";
import polyIcon from "../../assets/polygon.svg";
import {
  DeleteOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  ClearOutlined,
  StopFilled,
} from "@ant-design/icons";
import { KonvaEventListener, KonvaEventObject } from "konva/lib/Node";
import { Vector2d } from "konva/lib/types";
import { MarkData, ReviewAnnotationReq, SavedAnnotation } from "@/lib/types";
import { cacheTool, cn } from "@/lib/util";
import {
  List,
  Tooltip,
  Button,
  Divider,
  Slider,
  Typography,
  Rate,
  message,
  Spin,
} from "antd";
import Konva from "konva";
import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";

interface AnnonateImgProps {
  viewMode?: boolean;
  currentUrl?: string;
  nextUrl?: string;
  curAnnotation?: SavedAnnotation;
  reviewComp?: React.ReactNode;
}
/**
 * 图片标注组件
 * 用于在图片上进行各种标注操作，包括圆形、矩形和多边形标注
 */
export const AnnonateImg = forwardRef(
  (
    {
      viewMode,
      currentUrl,
      nextUrl,
      curAnnotation,
      reviewComp,
    }: AnnonateImgProps,
    ref: React.Ref<AnnotateComp>
  ) => {
    // 测试图片状态

    const [marks, setMarks] = useState<MarkData[]>([]);
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
    const [loading, setLoading] = useState(false);
    const [preloading, setPreloading] = useState(false);
    // 工具状态
    const tool = useRef<"circle" | "rect" | "polygon">(null);
    const linePivots = useRef<Konva.Circle[]>([]);
    const lineEnding = useRef(false);
    const [curTool, setCurTool] = useState<
      "circle" | "rect" | "polygon" | null
    >(null);

    useImperativeHandle(ref, () => ({
      getAnnotationMeta: (bucketId: number) => ({
        bucketId,
        marks: [...marks],
      }),
      clearMarks: () => {
        clearAllMarks();
      }
    }));
    // 绘图状态
    const drawing = useRef(false);
    const startPos = useRef<Vector2d>({ x: 0, y: 0 });
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

    useEffect(() => {
      if (curAnnotation) {
        if (curAnnotation.meta && curAnnotation.meta.marks) {
          // 设置 marks 状态
          setMarks(curAnnotation.meta.marks as MarkData[]);
          // 重新绘制标记
          redrawMarks(curAnnotation.meta.marks as MarkData[]);
        }
      } else {
        setMarks([]);
        redrawMarks([]);
      }
    }, [curAnnotation]);
    useEffect(() => {
      if (currentUrl) {
        if (imageLayerRef.current) {
          imageLayerRef.current.destroyChildren();
        }
        let img = cacheTool.get(currentUrl + "_image");
        if (img) {
          const konvaImage = (bgImageRef.current = new Konva.Image({
            image: img,
            x: 0,
            y: 0,
          }));
          imageLayerRef.current?.add(konvaImage);
          imageLayerRef.current?.batchDraw();
          return;
        }
        img = new Image();
        img.crossOrigin = "anonymous";
        setLoading(true);
        img.onload = () => {
          cacheTool.set(currentUrl + "_image", img);
          const konvaImage = (bgImageRef.current = new Konva.Image({
            image: img,
            x: 0,
            y: 0,
            name: "bgImg",
          }));

          if (imageLayerRef.current) {
            imageLayerRef.current.add(konvaImage);
            imageLayerRef.current.draw();
          }

          setLoading(false);
          linePivots.current.length = 0;
        };

        img.onerror = () => {
          message.error(`failed to load image: ${currentUrl}`);
          setLoading(false);
        };

        img.src = currentUrl;
      } else {
      }
    }, [currentUrl]);

    useEffect(() => {
      if (nextUrl) {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
          setPreloading(false);
        };

        img.onerror = () => {
          setPreloading(false);
        };

        img.src = nextUrl;
      }
    }, [nextUrl]);

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
      const newScale = Math.max(
        minScale,
        Math.min(maxScale, scale + scaleStep)
      );
      setScale(parseFloat(newScale.toFixed(2)));
    };

    // 缩小
    const zoomOut = () => {
      const newScale = Math.max(
        minScale,
        Math.min(maxScale, scale - scaleStep)
      );
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
      <div className="flex-1 flex gap-4">
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
            {curTool != null && (
              <Tooltip
                overlay="Click to Stop Drawing"
                placement="right"
                defaultOpen
              >
                <Button
                  className="animate-pulse"
                  danger
                  onClick={() => {
                    tool.current = null;
                    setCurTool(null);
                  }}
                  icon={<StopFilled />}
                ></Button>
              </Tooltip>
            )}
          </div>
        )}

        {/* 画布 */}
        <div className="relative flex-1 rounded-2xl bg-black p-4">
          <div
            ref={stageContainerRef}
            className="w-full h-full bg-transparent"
          />
          <Spin spinning={loading} className="absolute top-[50%] left-[50%]" />
        </div>

        {/* 右侧面板 - 标记列表和缩放控制 */}
        <div className={cn("w-[220px] flex flex-col gap-4")}>
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
            <div className="header flex justify-between items-center mb-4">
              <h4 className="text-xl text-green-700">Marks</h4>
              <Button
                danger
                disabled={viewMode}
                onClick={clearAllMarks}
                size="small"
                icon={<ClearOutlined />}
              >
                All
              </Button>
            </div>
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
                                  tooltip: "click to edit",
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
          {reviewComp}
        </div>
      </div>
    );
  }
);
