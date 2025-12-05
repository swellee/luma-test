package services

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	"luma-ai-backend/config"
	"luma-ai-backend/models"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// BucketService 存储桶服务
type BucketService struct{}

// NewBucketService 创建存储桶服务实例
func NewBucketService() *BucketService {
	return &BucketService{}
}

// CreateBucket 创建存储桶记录
func (bs *BucketService) CreateBucket(bucketReq *models.BucketReq) (*models.BucketResponse, error) {
	// 检查是否已存在同名存储桶
	existingBucket := &models.Bucket{}
	has, err := config.DB.Where("name = ?", bucketReq.Name).Get(existingBucket)
	if err != nil {
		return nil, err
	}
	if has {
		return nil, errors.New("存储桶名称已存在")
	}

	// err, path_mode := bs.ValidateBucket(bucketReq)
	// if err != nil {
	// 	return nil, err
	// }

	// 创建存储桶记录
	bucket := &models.Bucket{
		Name:      bucketReq.Name,
		Region:    bucketReq.Region,
		AccessKey: bucketReq.Access.Key,
		SecretKey: bucketReq.Access.Secret,
		PathMode:  bucketReq.PathMode,
	}

	// 插入数据库
	_, err = config.DB.Insert(bucket)
	if err != nil {
		return nil, err
	}

	// 返回响应
	return &models.BucketResponse{
		ID:        bucket.ID,
		Name:      bucket.Name,
		Region:    bucket.Region,
		CreatedAt: bucket.CreatedAt,
	}, nil
}

// GetBucket 根据ID获取存储桶
func (bs *BucketService) GetBucket(id int64) (*models.BucketResponse, error) {
	bucket := &models.Bucket{}
	has, err := config.DB.ID(id).Get(bucket)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("存储桶不存在")
	}

	// 返回响应（不包含敏感信息）
	return &models.BucketResponse{
		ID:     bucket.ID,
		Name:   bucket.Name,
		Region: bucket.Region,
		Access: models.BucketAccess{
			Key:    bucket.AccessKey,
			Secret: bucket.SecretKey,
		},
		CreatedAt: bucket.CreatedAt,
	}, nil
}

// GetBucketWithCredentials 根据ID获取存储桶（包含凭证，用于内部使用）
func (bs *BucketService) GetBucketWithCredentials(id int64) (*models.Bucket, error) {
	bucket := &models.Bucket{}
	has, err := config.DB.ID(id).Get(bucket)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("存储桶不存在")
	}

	return bucket, nil
}

// ListBuckets 获取存储桶列表
func (bs *BucketService) ListBuckets(page, pageSize int) (*models.ListBucketResponse, error) {
	var buckets []models.Bucket

	// 计算偏移量
	offset := (page - 1) * pageSize

	// 获取存储桶列表
	err := config.DB.Limit(pageSize, offset).Find(&buckets)
	if err != nil {
		return nil, err
	}

	// 获取总存储桶数
	total, err := config.DB.Count(&models.Bucket{})
	if err != nil {
		return nil, err
	}

	// 转换为响应列表
	bucketResponses := make([]models.BucketResponse, len(buckets))
	for i, bucket := range buckets {
		bucketResponses[i] = models.BucketResponse{
			ID:        bucket.ID,
			Name:      bucket.Name,
			Region:    bucket.Region,
			CreatedAt: bucket.CreatedAt,
		}
	}

	return &models.ListBucketResponse{
		List:  bucketResponses,
		Total: total,
	}, nil
}

// UpdateBucket 更新存储桶
func (bs *BucketService) UpdateBucket(id int64, bucketReq *models.BucketReq) (*models.BucketResponse, error) {
	// 获取现有存储桶
	existingBucket := &models.Bucket{}
	has, err := config.DB.ID(id).Get(existingBucket)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("存储桶不存在")
	}

	// 如果名称改变，检查是否已存在同名存储桶
	if existingBucket.Name != bucketReq.Name {
		duplicateBucket := &models.Bucket{}
		has, err := config.DB.Where("name = ?", bucketReq.Name).Get(duplicateBucket)
		if err != nil {
			return nil, err
		}
		if has && duplicateBucket.ID != id {
			return nil, errors.New("存储桶名称已存在")
		}
	}

	// 更新存储桶信息
	existingBucket.Name = bucketReq.Name
	existingBucket.Region = bucketReq.Region
	existingBucket.AccessKey = bucketReq.Access.Key
	existingBucket.SecretKey = bucketReq.Access.Secret

	// 更新数据库
	_, err = config.DB.ID(id).Update(existingBucket)
	if err != nil {
		return nil, err
	}

	// 返回响应
	return &models.BucketResponse{
		ID:        existingBucket.ID,
		Name:      existingBucket.Name,
		Region:    existingBucket.Region,
		CreatedAt: existingBucket.CreatedAt,
	}, nil
}

// DeleteBucket 删除存储桶
func (bs *BucketService) DeleteBucket(id int64) error {
	bucket := &models.Bucket{}
	has, err := config.DB.ID(id).Get(bucket)
	if err != nil {
		return err
	}
	if !has {
		return errors.New("存储桶不存在")
	}

	// 删除存储桶
	_, err = config.DB.ID(id).Delete(bucket)
	return err
}

// ExtractBucketNameFromURL 从URL中提取bucket名称
func (bs *BucketService) ExtractBucketNameFromURL(url string) string {
	// 移除协议前缀
	url = strings.TrimPrefix(url, "https://")
	url = strings.TrimPrefix(url, "http://")

	// 提取第一个部分作为bucket名称
	parts := strings.Split(url, ".")
	if len(parts) > 0 {
		return parts[0]
	}
	return url
}

// createS3Client 创建S3客户端
func (bs *BucketService) createS3Client(region, accessKey, secretKey string, pathMode bool) (*s3.Client, error) {
	ctx := context.Background()

	cfg, err := awsconfig.LoadDefaultConfig(ctx,
		awsconfig.WithRegion(region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			accessKey,
			secretKey,
			"", // session token
		)),
	)
	if err != nil {
		return nil, err
	}

	// 创建S3客户端，强制使用路径模式（path-style）
	// 这对于某些bucket是必需的，特别是那些使用路径模式的bucket
	client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.UsePathStyle = pathMode
	})

	return client, nil
}

// ValidateBucket 验证存储桶访问权限
func (bs *BucketService) ValidateBucket(bucketReq *models.BucketReq) (error, bool) {
	ctx := context.Background()

	// 先使用pathMode为true创建S3客户端，如果失败再尝试false
	client, err := bs.createS3Client(bucketReq.Region, bucketReq.Access.Key, bucketReq.Access.Secret, true)
	if err == nil {
		_, err = client.HeadBucket(ctx, &s3.HeadBucketInput{
			Bucket: aws.String(bucketReq.Name),
		})
		if err == nil {
			return nil, true // 成功
		}
		// 失败，尝试pathMode为false
		client, _ = bs.createS3Client(bucketReq.Region, bucketReq.Access.Key, bucketReq.Access.Secret, false)
		_, err = client.HeadBucket(ctx, &s3.HeadBucketInput{
			Bucket: aws.String(bucketReq.Name),
		})
		if err == nil {
			return nil, false // 成功
		}
	}

	if err != nil {
		return fmt.Errorf("bucket验证失败"), false
	}

	return nil, false
}

// ListObjects 获取存储桶中的对象列表（仅图片和视频）
func (bs *BucketService) ListObjects(bucketID int64, prefix string, page, pageSize int) (*models.ListObjectsResponse, error) {
	ctx := context.Background()

	// 获取存储桶信息
	bucket, err := bs.GetBucketWithCredentials(bucketID)
	if err != nil {
		return nil, err
	}

	// 创建S3客户端
	client, err := bs.createS3Client(bucket.Region, bucket.AccessKey, bucket.SecretKey, bucket.PathMode)
	if err != nil {
		return nil, err
	}

	// 定义图片和视频扩展名
	imageExtensions := map[string]bool{
		".jpg": true, ".jpeg": true, ".png": true, ".gif": true,
		".bmp": true, ".webp": true, ".svg": true,
	}
	videoExtensions := map[string]bool{
		".mp4": true, ".avi": true, ".mov": true, ".wmv": true,
		".flv": true, ".mkv": true, ".webm": true,
	}

	// 列出对象
	input := &s3.ListObjectsV2Input{
		Bucket: aws.String(bucket.Name),
		Prefix: aws.String(prefix),
	}

	// 由于S3不支持服务器端分页，我们需要获取所有对象然后在内存中分页
	paginator := s3.NewListObjectsV2Paginator(client, input)

	var allObjects []types.Object
	for paginator.HasMorePages() {
		page, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, err
		}
		allObjects = append(allObjects, page.Contents...)
	}

	// 筛选图片和视频文件
	var filteredObjects []models.ObjectInfo
	for _, obj := range allObjects {
		if obj.Key == nil {
			continue
		}

		key := *obj.Key
		ext := strings.ToLower(filepath.Ext(key))

		// 检查是否是图片或视频
		var fileType string
		if imageExtensions[ext] {
			fileType = "image"
		} else if videoExtensions[ext] {
			fileType = "video"
		} else {
			continue // 跳过非图片/视频文件
		}

		// 提取文件名
		name := filepath.Base(key)

		filteredObjects = append(filteredObjects, models.ObjectInfo{
			Key:          key,
			Name:         name,
			Type:         fileType,
			Size:         aws.ToInt64(obj.Size),
			LastModified: aws.ToTime(obj.LastModified),
		})
	}

	// 计算分页
	total := len(filteredObjects)
	start := (page - 1) * pageSize
	end := start + pageSize

	if start > total {
		start = total
	}
	if end > total {
		end = total
	}

	// 获取当前页的对象
	var pageObjects []models.ObjectInfo
	if start < end {
		pageObjects = filteredObjects[start:end]
	}

	return &models.ListObjectsResponse{
		Objects:  pageObjects,
		Total:    int64(total),
		Page:     page,
		PageSize: pageSize,
	}, nil
}
