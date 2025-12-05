package api

import (
	"net/http"

	"luma-ai-backend/models"
	"luma-ai-backend/services"
	"luma-ai-backend/utils"

	"github.com/gin-gonic/gin"
)

// 声明全局服务常量
var packageService = services.NewPackageService()

// SavePackage 创建或更新包
func SavePackage(c *gin.Context) {
	var req models.PackageReq
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	response, err := packageService.SavePackage(&req)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	utils.ResponseOk(c, response)
}

// PublishPackage 发布包
func PublishPackage(c *gin.Context) {
	id, err := utils.ParseInt64(c.Param("package_id"))
	if err != nil {
		utils.ResponseErr(c, "无效的包ID", http.StatusBadRequest)
		return
	}

	response, err := packageService.PublishPackage(id)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	utils.ResponseOk(c, response)
}

// GetPackageList 获取包列表
func GetPackageList(c *gin.Context) {
	var req models.PackageListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	response, err := packageService.ListPackages(req.Page, req.PageSize)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusInternalServerError)
		return
	}

	utils.ResponseOk(c, response)
}

// GetPackageDetail 获取包详情
func GetPackageDetail(c *gin.Context) {
	id, err := utils.ParseInt64(c.Param("package_id"))
	if err != nil {
		utils.ResponseErr(c, "无效的包ID", http.StatusBadRequest)
		return
	}

	response, err := packageService.GetPackage(id)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusNotFound)
		return
	}

	utils.ResponseOk(c, response)
}

// DeletePackage 删除包
func DeletePackage(c *gin.Context) {
	id, err := utils.ParseInt64(c.Param("package_id"))
	if err != nil {
		utils.ResponseErr(c, "无效的包ID", http.StatusBadRequest)
		return
	}

	err = packageService.DeletePackage(id)
	if err != nil {
		utils.ResponseErr(c, err.Error(), http.StatusBadRequest)
		return
	}

	utils.ResponseSuccess(c)
}
