import { message } from "antd";
import { http } from "../http";
import {
  Bucket,
  BucketAccess,
  BucketObjectListRes,
  BucketReq,
  ListBucketRes,
  ObjectInfo,
} from "../types";
import {
  S3Client,
  ListObjectsV2Command,
  ListObjectsV2CommandInput,
  HeadBucketCommand,
  _Object,
} from "@aws-sdk/client-s3";

export type DirectoryNode = {
  key: string; // full prefix
  title: React.ReactNode; // cur dir name
  children?: DirectoryNode[];
  isLeaf: boolean;
};
export const bucket = {
  listBuckets(params: { page: number; page_size: number }) {
    return http<ListBucketRes>("/bucket/list", {
      params,
      method: "GET",
    });
  },
  async addBucket(bucketReq: BucketReq) {
    // 使用后端验证bucket
    bucketReq.path_mode = true; // 默认使用path模式
    // todo, 先验证bucket是否存在
    const valid = await checkBucketAccess(bucketReq);
    if (!valid) {
      message.error("Bucket不存在");
      return;
    }
    return http<Bucket>("/bucket/add", {
      data: bucketReq,
      method: "POST",
    });
  },
  async getBucket(id: number) {
    return http<Bucket>(`/bucket/${id}`, {
      method: "GET",
    });
  },
  async delBucket(id: number) {
    return http<Bucket>(`/bucket/${id}`, {
      method: "DELETE",
    });
  },
  async listObjects(
    bucketInfo: Bucket,
    prefix?: string,
    pageSize: number = 100,
    continuationToken?: string
  ): Promise<BucketObjectListRes> {
    try {
      // 创建S3客户端
      const s3 = getS3(bucketInfo.region, bucketInfo.access);

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

      let allFilteredObjects: ObjectInfo[] = [];
      let totalEstimated = 0;
      let hasMore = false;
      let nextContinuationToken: string | undefined = undefined;

      const firstPageCommand = new ListObjectsV2Command({
        Bucket: bucketInfo.name,
        Prefix: prefix || "",
        MaxKeys: pageSize,
        Delimiter: "/",
        ContinuationToken: continuationToken,
      });
      const response = await s3.send(firstPageCommand);

      // UI层做了限制，这里不处理子目录

      // 处理第一页的文件对象
      if (response.Contents) {
        for (const obj of response.Contents) {
          if (!obj.Key) {
            continue;
          }

          const key = obj.Key;

          // 跳过目录本身（以/结尾的通常是目录）
          if (key === (prefix || "") || key.endsWith("/")) {
            continue;
          }

          const name = key.split("/").pop() || key;
          const ext = name.toLowerCase().substring(name.lastIndexOf("."));

          // 检查文件类型
          let fileType = "";
          if (imageExtensions.has(ext)) {
            fileType = "image";
          } else if (videoExtensions.has(ext)) {
            fileType = "video";
          } else {
            continue; // 跳过非图片/视频文件
          }

          allFilteredObjects.push({
            key,
            name,
            type: fileType,
            size: ((obj.Size || 0)/ 1024 / 1024).toFixed(1) + 'MB',
            last_modified: obj.LastModified
              ? obj.LastModified.toISOString()
              : new Date().toISOString(),
          });
        }
      }

      // 更新分页状态
      hasMore = response.IsTruncated || false;
      nextContinuationToken = response.NextContinuationToken;
      totalEstimated = response.KeyCount || allFilteredObjects.length;

      return {
        list: allFilteredObjects,
        total: totalEstimated,
        nextContinuationToken,
        hasMore,
      } as any;
    } catch (error) {
      console.error("Error listing S3 objects:", error);
      message.error("获取文件列表失败");
      throw error;
    }
  },

  // 新方法：获取目录树结构 - 从根目录开始获取真实目录
  async listDirectoryTree(
    bucketInfo: Bucket,
    basePrefix: string = "",
    depth: number = 10 // 增加深度以获取更多层级
  ): Promise<DirectoryNode[]> {
    try {
      const s3 = getS3(bucketInfo.region, bucketInfo.access);

      const result: DirectoryNode[] = [];

      // 递归获取目录结构
      const exploreDirectory = async (
        currentPrefix: string,
        currentDepth: number,
        currentResult: DirectoryNode[]
      ) => {
        if (currentDepth > depth) return;

        const params: ListObjectsV2CommandInput = {
          Bucket: bucketInfo.name,
          Prefix: currentPrefix,
          Delimiter: "/",
          MaxKeys: 100,
        };

        const command = new ListObjectsV2Command(params);
        const response = await s3.send(command);

        // 处理子目录
        if (response.CommonPrefixes) {
          for (const prefixObj of response.CommonPrefixes) {
            if (prefixObj.Prefix) {
              const dirPrefix = prefixObj.Prefix;
              const dirName = dirPrefix
                .replace(currentPrefix, "")
                .replace("/", "");

              if (dirName) {
                // 检查这个目录是否有子目录
                let hasChildren = false;
                if (currentDepth < depth) {
                  // 检查下一层是否有子目录
                  const checkParams: ListObjectsV2CommandInput = {
                    Bucket: bucketInfo.name,
                    Prefix: dirPrefix,
                    Delimiter: "/",
                    MaxKeys: 100,
                  };

                  try {
                    const checkCommand = new ListObjectsV2Command(checkParams);
                    const checkResponse = await s3.send(checkCommand);
                    hasChildren = !!(
                      checkResponse.CommonPrefixes &&
                      checkResponse.CommonPrefixes.length > 0
                    );
                  } catch (e) {
                    console.error("Error checking subdirectories:", e);
                  }
                }
                const node: DirectoryNode = {
                  key: dirPrefix,
                  title: dirName,
                  isLeaf: !hasChildren,
                };
                currentResult.push(node);

                // 递归探索子目录
                if (hasChildren) {
                  node.children ||= [];
                  await exploreDirectory(
                    dirPrefix,
                    currentDepth + 1,
                    node.children
                  );
                }
              }
            }
          }
        }
      };

      await exploreDirectory(basePrefix, 1, result);
      return result;
    } catch (error) {
      console.error("Error exploring directory tree:", error);
      return [];
    }
  },
};

function getS3(region: string, access: BucketAccess) {
  return new S3Client({
    region: region,
    credentials: {
      accessKeyId: access.key,
      secretAccessKey: access.secret,
    },
    // 禁用加速模式（某些区域可能需要）
    useAccelerateEndpoint: false,
    // 强制使用路径样式访问（与AWS控制台显示的URL格式一致）
    forcePathStyle: true,
    // 最大重试次数
    maxAttempts: 2,
    // 添加自定义用户代理，可能有助于某些CORS场景
    customUserAgent: "LumaAI-Bucket-Validator/1.0",
  });
}

async function checkBucketAccess(bucket: BucketReq) {
  const s3 = getS3(bucket.region, bucket.access);
  const command = new HeadBucketCommand({
    Bucket: bucket.name,
  });
  try {
    await s3.send(command);
    return true;
  } catch (e) {
    return false;
  }
}
