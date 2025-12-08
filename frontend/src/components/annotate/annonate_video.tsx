import {
  SavedAnnotation,
  ReviewAnnotationReq,
  TaskStatus,
  VideoMarkData,
} from "@/lib/types";
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  useCallback,
} from "react";
import { AnnotateComp } from "./shared";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import {
  Button,
  List,
  Input,
  Slider,
  Typography,
  Tooltip,
  Divider,
  message,
  InputNumber,
  Spin,
  Empty,
} from "antd";
import Icon, {
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ScissorOutlined,
  ClearOutlined,
  EyeFilled,
} from "@ant-design/icons";
import { cacheTool, cn } from "@/lib/util";
import { useKeyPress } from "ahooks";

interface AnnonateVideoProps {
  viewMode?: boolean;
  currentUrl?: string;
  nextUrl?: string;
  curAnnotation?: SavedAnnotation;
  reviewComp?: React.ReactNode;
}

interface VideoSegment {
  id: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
  color?: string;
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
    const videoRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [segments, setSegments] = useState<VideoSegment[]>([]);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(
      null
    );
    // 时间轴交互状态
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [tempStart, setTempStart] = useState<number | null>(null);
    const [tempEnd, setTempEnd] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [dragInfo, setDragInfo] = useState<{
      segmentId: string;
      edge: "start" | "end";
      startX: number;
      originalStart: number;
      originalEnd: number;
    } | null>(null);

    // 初始化 video.js 播放器
    useEffect(() => {
      // Make sure Video.js player is only initialized once
      if (!playerRef.current) {
        // The Video.js player needs to be _inside_ the component el for React 18 Strict Mode.
        const videoElement = document.createElement("video-js");

        videoElement.classList.add("vjs-big-play-centered");
        videoRef.current!.appendChild(videoElement);

        const player = (playerRef.current = videojs(
          videoElement,
          {
            autoplay: true,
            controls: false,
            responsive: true,
            fluid: true,
            sources: [
              {
                src: "",
                type: "video/mp4",
              },
            ],
          },
          () => {
            videojs.log("player is ready");
          }
        ));
        playerRef.current = player;

        player.on("waiting", () => {
          videojs.log("player is waiting");
        });

        player.on("dispose", () => {
          videojs.log("player will dispose");
        });
        player.on("timeupdate", () => {
          setCurrentTime(player.currentTime() || 0);
        });

        player.on("loadedmetadata", () => {
          setDuration(player.duration() || 0);
        });

        player.on("play", () => {
          setIsPlaying(true);
        });

        player.on("pause", () => {
          setIsPlaying(false);
        });

        player.on("error", () => {
          console.error("Video.js error:", player.error());
        });

        return () => {
          if (player && !player.isDisposed()) {
            player.dispose();
            playerRef.current = null;
          }
        };
      }
    }, []);
    useEffect(() => {
      if (!containerRef.current || !currentUrl) return;
      const player = playerRef.current;
      setDuration(0);
      player.autoplay(true);
      player.src(currentUrl);
      containerRef?.current?.focus();
    }, [currentUrl]);

    // 加载已保存的标注数据
    useEffect(() => {
      if (curAnnotation && curAnnotation.meta && curAnnotation.meta.marks) {
        const videoMarks = curAnnotation.meta.marks.find(
          (mark): mark is VideoMarkData =>
            (mark as VideoMarkData).data &&
            Array.isArray((mark as VideoMarkData).data)
        );
        if (videoMarks && videoMarks.data) {
          // 假设 data 是 VideoSegment 数组
          setSegments(videoMarks.data as VideoSegment[]);
        } else {
          setSegments([]);
        }
      } else {
        setSegments([]);
      }
    }, [curAnnotation]);

    useEffect(() => {
      if (nextUrl) {
        const cachedVideo = cacheTool.get(nextUrl + "_video");
        if (cachedVideo) {
          // 已经缓存，无需预加载
          return;
        }
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.preload = "metadata";
        video.onloadedmetadata = () => {
          // cacheTool.set(nextUrl + "_video", video);
        };
        video.onerror = () => {
          console.warn(`预加载视频失败: ${nextUrl}`);
        };
        video.src = nextUrl;
      }
    }, [nextUrl]);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      getAnnotationMeta: (bucketId: number) => ({
        bucketId,
        marks: [
          {
            data: segments,
          },
        ] as VideoMarkData[],
      }),
      clearMarks: () => {
        setSegments([]);
      },
    }));

    const handleSeek = (time: number) => {
      if (!playerRef.current) return;
      playerRef.current.currentTime(time);
    };

    const handleDeleteSegment = (id: string) => {
      if (viewMode) return;
      setSegments(segments.filter((seg) => seg.id !== id));
    };

    const handleSegmentTextChange = (id: string, text: string) => {
      if (viewMode) return;
      setSegments(
        segments.map((seg) => (seg.id === id ? { ...seg, text } : seg))
      );
    };

    const handleSegmentTimeChange = (
      id: string,
      field: "start" | "end",
      value: number
    ) => {
      if (viewMode) return;
      setSegments(
        segments.map((seg) =>
          seg.id === id ? { ...seg, [field]: value } : seg
        )
      );
    };

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    };

    const handleJumpToSegment = (segment: VideoSegment) => {
      if (playerRef.current) {
        playerRef.current.currentTime(segment.start);
      }
    };

    const togglePlay = () => {
      if (!playerRef.current) return;
      if (isPlaying) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
    };
    useKeyPress("space", (e) => {
      e.preventDefault();
      togglePlay();
    });

    // 时间轴鼠标移动
    const handleTimelineMouseMove = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!timelineRef.current || duration === 0) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const time = percent * duration;
        setHoverTime(time);
      },
      [duration]
    );

    // 时间轴点击
    const handleTimelineClick = useCallback(() => {
      if (viewMode || duration === 0 || hoverTime === null) return;
      playerRef.current?.currentTime(hoverTime);
      if (!isCreating) {
        // 第一次点击：设置开始时间
        setTempStart(hoverTime);
        setTempEnd(null);
        setIsCreating(true);
      } else {
        // 第二次点击：设置结束时间并创建切片
        if (tempStart === null) return;
        let start = tempStart;
        let end = hoverTime;
        if (end <= start) {
          // 如果结束时间小于开始时间，交换
          [start, end] = [end, start];
        }
        const newSegment: VideoSegment = {
          id: `segment-${Date.now()}`,
          start,
          end,
          text: `cut ${segments.length + 1}`,
          color: "#8b5cf6", // 紫色
        };
        setSegments([...segments, newSegment]);
        setTempStart(null);
        setTempEnd(null);
        setIsCreating(false);
      }
    }, [viewMode, duration, hoverTime, isCreating, tempStart, segments]);

    // 切片鼠标按下（拖动整个切片）
    const handleSegmentMouseDown = useCallback(
      (e: React.MouseEvent, segment: VideoSegment) => {
        if (viewMode) return;
        e.stopPropagation();
        setSelectedSegmentId(segment.id);
        // 可以在此实现拖动整个切片，但为了简化，暂不实现
      },
      [viewMode]
    );

    // 调整大小开始
    const handleResizeStart = useCallback(
      (e: React.MouseEvent, segment: VideoSegment, edge: "start" | "end") => {
        if (viewMode) return;
        e.stopPropagation();
        setDragInfo({
          segmentId: segment.id,
          edge,
          startX: e.clientX,
          originalStart: segment.start,
          originalEnd: segment.end,
        });
      },
      [viewMode]
    );

    // 全局鼠标事件用于拖动调整
    useEffect(() => {
      if (!dragInfo) return;

      const handleMouseMove = (e: MouseEvent) => {
        if (!timelineRef.current || duration === 0) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = Math.max(0, Math.min(1, x / rect.width));
        const time = percent * duration;

        setSegments((prev) =>
          prev.map((seg) => {
            if (seg.id !== dragInfo.segmentId) return seg;
            const { edge, originalStart, originalEnd } = dragInfo;
            if (edge === "start") {
              // 确保开始时间不超过结束时间，且不小于0
              const newStart = Math.max(0, Math.min(originalEnd - 0.1, time));
              return { ...seg, start: newStart };
            } else {
              // 确保结束时间不小于开始时间，且不超过总时长
              const newEnd = Math.max(
                originalStart + 0.1,
                Math.min(duration, time)
              );
              return { ...seg, end: newEnd };
            }
          })
        );
      };

      const handleMouseUp = () => {
        setDragInfo(null);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, [dragInfo, duration]);

    return (
      <div className="flex-1 flex gap-4">
        {/* 左侧视频播放器 */}
        <div className="relative flex-1 flex flex-col rounded-2xl bg-black p-4">
          <div data-vjs-player ref={containerRef} className="flex-1 max-h-[calc(100vh-366px)] overflow-hidden">
            <div ref={videoRef}  />
          </div>

          {/* 时间轴和切片可视化 */}
          <div className="bg-gray-900 p-4 rounded-lg mb-2">
            <div className="flex items-center justify-between">
              <span className="text-white">Timeline</span>
              <Button
                icon={
                  isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />
                }
                onClick={togglePlay}
                type="text"
                className="mr-auto"
              />
              <Spin spinning={duration === 0} />

              <span className="text-gray-400">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>
          <div
            className="relative h-8 bg-gray-800 rounded cursor-crosshair"
            onMouseMove={handleTimelineMouseMove}
            onClick={handleTimelineClick}
            onMouseLeave={() => setHoverTime(null)}
            ref={timelineRef}
          >
            {/* 时间轴背景 */}
            <Slider
              min={0}
              max={duration}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              tooltip={{ formatter: (value) => formatTime(value || 0) }}
              className="absolute top-0 left-0 right-0"
              disabled={viewMode}
            />
            {/* 悬停指示器 */}
            {hoverTime !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white opacity-60"
                style={{ left: `${(hoverTime / duration) * 100}%` }}
              />
            )}
            {/* 切片标记 */}
            {segments.map((segment) => (
              <div
                key={segment.id}
                className="absolute cursor-auto h-6 bg-purple-600 opacity-70 border border-purple-300 rounded"
                style={{
                  left: `${(segment.start / duration) * 100}%`,
                  width: `${((segment.end - segment.start) / duration) * 100}%`,
                  top: "4px",
                }}
                onClick={(e) => handleSegmentMouseDown(e, segment)}
              >
                {/* 左侧拖动柄 */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 bg-purple-800 cursor-ew-resize"
                  onMouseDown={(e) => handleResizeStart(e, segment, "start")}
                />
                {/* 右侧拖动柄 */}
                <div
                  className="absolute right-0 top-0 bottom-0 w-1 bg-purple-800 cursor-ew-resize"
                  onMouseDown={(e) => handleResizeStart(e, segment, "end")}
                />
              </div>
            ))}
            {/* 临时创建标记 */}
            {tempStart !== null && (
              <div
                className="absolute h-6 bg-purple-400 opacity-50 border border-purple-300"
                style={{
                  left: `${(tempStart / duration) * 100}%`,
                  width:
                    tempEnd !== null
                      ? `${((tempEnd - tempStart) / duration) * 100}%`
                      : "2px",
                  top: "4px",
                }}
              />
            )}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            提示：{viewMode? "审核模式下无法编辑切片":"鼠标悬停在时间轴上显示十字图标，点击第一下设置开始，第二下设置结束"}
          </div>
        </div>

        {/* 右侧切片列表 */}
        <div className="w-[280px] h-full flex flex-col gap-4">
          <div className="p-4 bg-black flex-1 rounded-2xl">
            <div className="header flex justify-between items-center mb-4">
              <h4 className="text-xl text-green-700">Cuts</h4>
              <Button
                danger
                icon={<ClearOutlined />}
                onClick={() => setSegments([])}
                disabled={segments.length === 0}
              >
                Clear All
              </Button>
            </div>

            {segments.length === 0 ? (
              <div className="text-gray-500 text-center py-8">No cuts yet</div>
            ) : (
              <div className="overflow-y-auto h-full">
                <List
                  dataSource={segments}
                  renderItem={(segment) => (
                    <List.Item
                      className={cn(
                        "border border-gray-800 rounded-lg p-3 mb-2",
                        selectedSegmentId === segment.id &&
                          "shadow-lg border-purple-500"
                      )}
                      actions={[
                        !viewMode && (
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleDeleteSegment(segment.id)}
                          />
                        ),
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor: segment.color || "#ff0000",
                              }}
                            />
                            <Typography.Text
                              editable={
                                !viewMode && {
                                  onChange: (text) =>
                                    handleSegmentTextChange(segment.id, text),
                                  tooltip: "点击编辑",
                                  maxLength: 50,
                                }
                              }
                              className="text-white"
                            >
                              {segment.text}
                            </Typography.Text>
                          </div>
                        }
                        description={
                          <div className="text-gray-400 text-sm">
                            <div>
                              时间: {formatTime(segment.start)} -{" "}
                              {formatTime(segment.end)}
                              <EyeFilled
                                className="ml-4"
                                onClick={() => handleJumpToSegment(segment)}
                              />
                            </div>

                            <div className="flex gap-2 mt-1">
                              {!viewMode && (
                                <>
                                  <InputNumber
                                    size="small"
                                    type="number"
                                    step="0.1"
                                    value={segment.start}
                                    onChange={(e) =>
                                      handleSegmentTimeChange(
                                        segment.id,
                                        "start",
                                        +Math.max(0, e!).toFixed(2)
                                      )
                                    }
                                    prefix="start"
                                    className="w-30"
                                  />
                                  <InputNumber
                                    size="small"
                                    type="number"
                                    step="0.1"
                                    value={segment.end}
                                    onChange={(e) =>
                                      handleSegmentTimeChange(
                                        segment.id,
                                        "end",
                                        +Math.min(
                                          duration,
                                          Math.max(e!, segment.start + 0.1)
                                        ).toFixed(2)
                                      )
                                    }
                                    prefix="end"
                                    className="w-30"
                                  />
                                </>
                              )}
                            </div>
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
