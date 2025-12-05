package api

import (
	"bytes"
	"fmt"
	"io"
	"log"
	"path/filepath"
	"strings"

	"luma-ai-backend/config"
	"luma-ai-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// UploadFile 上传文件到阿里云OSS
func UploadFile(c *gin.Context) {
	// 从表单中获取文件
	file, err := c.FormFile("file")
	if err != nil {
		utils.ResponseErr(c, err.Error(), 400)
		return
	}

	// 获取文件扩展名
	ext := filepath.Ext(file.Filename)

	// 生成唯一文件名
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)

	// 打开文件
	src, err := file.Open()
	if err != nil {
		utils.ResponseErr(c, "failed to open file", 500)
		return
	}
	defer src.Close()

	// 读取文件内容到内存
	fileBytes, err := io.ReadAll(src)
	if err != nil {
		utils.ResponseErr(c, "failed to read file", 500)
		return
	}

	// 上传到阿里云OSS
	err = uploadToAliyunOSS(c, bytes.NewReader(fileBytes), filename)
	if err != nil {
		log.Printf("failed to upload file to aliyun oss: %v", err)
		utils.ResponseErr(c, "faild to upload file to aliyun oss", 500)
		return
	}
}

func DeleteFile(c *gin.Context) {
	key := c.Query("key")
	if key == "" {
		utils.ResponseErr(c, "key is required", 400)
		return
	}

	// 删除阿里云OSS文件
	err := deleteFromAliyunOSS(key)
	if err != nil {
		log.Printf("failed to delete file from aliyun oss: %v", err)
		utils.ResponseErr(c, "failed to delete file from aliyun oss", 500)
		return
	}

	utils.ResponseSuccess(c)
}

// uploadToAliyunOSS 上传到阿里云OSS
func uploadToAliyunOSS(c *gin.Context, src io.Reader, filename string) error {
	// 获取存储空间
	bucket, err := config.GetOSSBucket()
	if err != nil {
		return err
	}

	// 上传文件
	err = bucket.PutObject(filename, src)
	if err != nil {
		return err
	}

	// 构建完整的文件URL
	fileURL := fmt.Sprintf("%s/%s", config.Aliyun.Domain, filename)
	if !strings.Contains(fileURL, "http") {
		fileURL = "http://" + fileURL
	}

	response := map[string]interface{}{
		"url":  fileURL,
		"key":  filename,
		"hash": "", // 阿里云OSS没有直接返回hash值
	}
	utils.ResponseOk(c, response)
	return nil
}

// deleteFromAliyunOSS 从阿里云OSS删除文件
func deleteFromAliyunOSS(key string) error {
	bucket, err := config.GetOSSBucket()
	if err != nil {
		return err
	}

	key = strings.TrimPrefix(key, config.Aliyun.Domain+"/")
	err = bucket.DeleteObject(key)
	return err
}
