package models

import (
	"time"
)

// Bucket S3存储桶模型
type Bucket struct {
	ID        int64     `xorm:"pk autoincr 'id'" json:"id"`
	Name      string    `xorm:"varchar(100) not null 'name'" json:"name"`
	Region    string    `xorm:"varchar(50) not null 'region'" json:"region"`
	PathMode  bool      `xorm:"bool default false 'path_mode'" json:"path_mode"`
	AccessKey string    `xorm:"varchar(255) not null 'access_key'" json:"-"`
	SecretKey string    `xorm:"varchar(255) not null 'secret_key'" json:"-"`
	CreatedAt time.Time `xorm:"created 'created_at'" json:"created_at"`
	UpdatedAt time.Time `xorm:"updated 'updated_at'" json:"updated_at"`
}

// BucketAccess S3访问凭证
type BucketAccess struct {
	Key    string `json:"key"`
	Secret string `json:"secret"`
}

// BucketReq 创建/更新存储桶请求
type BucketReq struct {
	ID       int64        `json:"id"`
	Name     string       `json:"name" binding:"required"`
	Region   string       `json:"region" binding:"required"`
	PathMode bool         `json:"path_mode"`
	Access   BucketAccess `json:"access" binding:"required"`
}

// BucketResponse 存储桶detail
type BucketResponse struct {
	ID        int64        `json:"id"`
	Name      string       `json:"name"`
	Region    string       `json:"region"`
	Access    BucketAccess `json:"access"`
	CreatedAt time.Time    `json:"created_at"`
}

// ListBucketRequest 存储桶列表请求
type ListBucketRequest struct {
	Page     int `form:"page" binding:"required,min=1"`
	PageSize int `form:"page_size" binding:"required,min=1,max=100"`
}

// ListBucketResponse 存储桶列表响应
type ListBucketResponse struct {
	List  []BucketResponse `json:"list"`
	Total int64            `json:"total"`
}

// ObjectInfo 对象信息
type ObjectInfo struct {
	Key          string    `json:"key"`
	Name         string    `json:"name"`
	Type         string    `json:"type"` // "image" or "video"
	Size         int64     `json:"size"`
	LastModified time.Time `json:"last_modified"`
}

// ListObjectsRequest 对象列表请求
type ListObjectsRequest struct {
	BucketID int64  `form:"bucket_id" binding:"required"`
	Prefix   string `form:"prefix"`
	Page     int    `form:"page" binding:"required,min=1"`
	PageSize int    `form:"page_size" binding:"required,min=1,max=100"`
}

// ListObjectsResponse 对象列表响应
type ListObjectsResponse struct {
	Objects  []ObjectInfo `json:"objects"`
	Total    int64        `json:"total"`
	Page     int          `json:"page"`
	PageSize int          `json:"page_size"`
}
