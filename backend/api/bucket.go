package api

import (
	"net/http"

	"luma-ai-backend/models"
	"luma-ai-backend/services"
	"luma-ai-backend/utils"

	"github.com/gin-gonic/gin"
)

// 声明全局服务常量
var bucketService = services.NewBucketService()

// ListBuckets 获取存储桶列表
func ListBuckets(c *gin.Context) {
	var req models.ListBucketRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	response, err := bucketService.ListBuckets(req.Page, req.PageSize)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusInternalServerError)
		return
	}

	utils.ResponseOk(c, response)
}

// AddBucket 添加存储桶
func AddBucket(c *gin.Context) {
	var req models.BucketReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	response, err := bucketService.CreateBucket(&req)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	utils.ResponseOk(c, response)
}

// GetBucket 获取存储桶详情
func GetBucket(c *gin.Context) {
	id, err := utils.ParseInt64(c.Param("id"))
	if err != nil {
		utils.ResponseErr(c, "无效的存储桶ID", http.StatusBadRequest)
		return
	}

	response, err := bucketService.GetBucket(id)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusNotFound)
		return
	}

	utils.ResponseOk(c, response)
}

// UpdateBucket 更新存储桶
func UpdateBucket(c *gin.Context) {
	id, err := utils.ParseInt64(c.Param("id"))
	if err != nil {
		utils.ResponseErr(c, "无效的存储桶ID", http.StatusBadRequest)
		return
	}

	var req models.BucketReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	response, err := bucketService.UpdateBucket(id, &req)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	utils.ResponseOk(c, response)
}

// DeleteBucket 删除存储桶
func DeleteBucket(c *gin.Context) {
	id, err := utils.ParseInt64(c.Param("id"))
	if err != nil {
		utils.ResponseErr(c, "无效的存储桶ID", http.StatusBadRequest)
		return
	}

	err = bucketService.DeleteBucket(id)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusInternalServerError)
		return
	}

	utils.ResponseSuccess(c)
}

// ListObjects 获取存储桶中的对象列表
func ListObjects(c *gin.Context) {
	var req models.ListObjectsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	response, err := bucketService.ListObjects(req.BucketID, req.Prefix, req.Page, req.PageSize)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusInternalServerError)
		return
	}

	utils.ResponseOk(c, response)
}
