import { message } from "antd";
import { http } from "../http";
import { Bucket, BucketAccess, BucketObjectListRes, BucketReq, ListBucketRes, ObjectInfo } from "../types";
import { S3Client, ListObjectsCommand,GetObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";


export const bucket = {
    listBuckets(params: {page:number, page_size:number} ) {
        return http<ListBucketRes>("/bucket/list", {
            params,
            method: "GET",
        })
    },
    async addBucket(bucketReq: BucketReq){
        // 使用后端验证bucket
        bucketReq.path_mode = true; // 默认使用path模式
        // todo, 先验证bucket是否存在
        return http<Bucket>("/bucket/add", {
            data: bucketReq,
            method: "POST",
        })
    },
    async getBucket(id: number) {
        return http<Bucket>(`/bucket/${id}`, {
            method: "GET",
        })
    },
    async listObjects(bucketId: number, prefix?: string, page: number = 1, pageSize: number = 100) {
        return http<BucketObjectListRes>("/bucket/objects", {
            params: {
                bucket_id: bucketId,
                prefix,
                page,
                page_size: pageSize,
            },
            method: "GET",
        })
    }
}

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
        customUserAgent: 'LumaAI-Bucket-Validator/1.0',
    });
}
