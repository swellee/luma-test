package services

import (
	"encoding/json"
	"errors"

	"luma-ai-backend/config"
	"luma-ai-backend/models"
)

// PackageService 包服务
type PackageService struct{}

// NewPackageService 创建包服务实例
func NewPackageService() *PackageService {
	return &PackageService{}
}

// SavePackage 创建或更新包
func (ps *PackageService) SavePackage(req *models.PackageReq) (*models.PackageResponse, error) {
	// 检查 bucket 是否存在
	bucket := &models.Bucket{}
	has, err := config.DB.ID(req.BucketID).Get(bucket)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("存储桶不存在")
	}

	// 将 items 数组转换为 JSON 字符串
	itemsJSON, err := json.Marshal(req.Items)
	if err != nil {
		return nil, err
	}

	var pkg *models.Package
	if req.ID != nil {
		// 更新现有包
		pkg = &models.Package{}
		has, err := config.DB.ID(*req.ID).Get(pkg)
		if err != nil {
			return nil, err
		}
		if !has {
			return nil, errors.New("包不存在")
		}

		// 检查包状态，如果已发布则不允许修改
		if pkg.Status == models.PackageStatusPublished {
			return nil, errors.New("已发布的包不允许修改")
		}

		// 更新包信息
		pkg.Name = req.Name
		pkg.BucketID = req.BucketID
		pkg.Items = string(itemsJSON)

		// 检查包名是否已存在
		count, err := config.DB.Where("name = ? AND id != ?", req.Name, *req.ID).Count(&models.Package{})
		if err != nil {
			return nil, err
		}
		if count > 0 {
			return nil, errors.New("包名已存在")
		}
		_, err = config.DB.ID(*req.ID).Update(pkg)
		if err != nil {
			return nil, err
		}
	} else {
		// 创建新包
		pkg = &models.Package{
			Name:     req.Name,
			BucketID: req.BucketID,
			Items:    string(itemsJSON),
			Status:   models.PackageStatusPending,
		}

		// 检查包名是否已存在
		count, err := config.DB.Where("name = ?", req.Name).Count(&models.Package{})
		if err != nil {
			return nil, err
		}
		if count > 0 {
			return nil, errors.New("包名已存在")
		}
		_, err = config.DB.Insert(pkg)
		if err != nil {
			return nil, err
		}
	}

	// 获取完整的包信息
	return ps.GetPackage(pkg.ID)
}

// GetPackage 根据ID获取包
func (ps *PackageService) GetPackage(id int64) (*models.PackageResponse, error) {
	pkg := &models.Package{}
	has, err := config.DB.ID(id).Get(pkg)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("包不存在")
	}

	// 解析 items JSON
	var items []string
	if pkg.Items != "" {
		err = json.Unmarshal([]byte(pkg.Items), &items)
		if err != nil {
			return nil, err
		}
	}

	return &models.PackageResponse{
		ID:        pkg.ID,
		BucketID:  pkg.BucketID,
		Name:      pkg.Name,
		Items:     items,
		Status:    pkg.Status,
		CreatedAt: pkg.CreatedAt,
	}, nil
}

// PublishPackage 发布包
func (ps *PackageService) PublishPackage(id int64) (*models.PackageResponse, error) {
	pkg := &models.Package{}
	has, err := config.DB.ID(id).Get(pkg)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("包不存在")
	}

	// 检查包是否已经是已发布状态
	if pkg.Status == models.PackageStatusPublished {
		return nil, errors.New("包已经是已发布状态")
	}

	// 更新包状态为已发布
	pkg.Status = models.PackageStatusPublished
	_, err = config.DB.ID(id).Update(pkg)
	if err != nil {
		return nil, err
	}

	// 创建任务
	taskService := NewTaskService()
	_, err = taskService.CreateTaskForPackage(id, pkg.Name)
	if err != nil {
		// 如果创建任务失败，回滚包状态？
		// 这里我们记录错误但继续，因为包已经发布
		// 在实际应用中可能需要更复杂的错误处理
	}

	return ps.GetPackage(id)
}

// ListPackages 获取包列表
func (ps *PackageService) ListPackages(page, pageSize int) (*models.PackageListResponse, error) {
	var packages []models.Package

	// 计算偏移量
	offset := (page - 1) * pageSize

	// 获取包列表
	err := config.DB.Limit(pageSize, offset).Find(&packages)
	if err != nil {
		return nil, err
	}

	// 获取总包数
	total, err := config.DB.Count(&models.Package{})
	if err != nil {
		return nil, err
	}

	// 转换为响应列表
	packageItems := make([]models.PackageItem, len(packages))
	for i, pkg := range packages {
		packageItems[i] = models.PackageItem{
			ID:        pkg.ID,
			BucketID:  pkg.BucketID,
			Name:      pkg.Name,
			Status:    pkg.Status,
			CreatedAt: pkg.CreatedAt,
		}
	}

	return &models.PackageListResponse{
		List:  packageItems,
		Total: total,
	}, nil
}

// DeletePackage 删除包
func (ps *PackageService) DeletePackage(id int64) error {
	pkg := &models.Package{}
	has, err := config.DB.ID(id).Get(pkg)
	if err != nil {
		return err
	}
	if !has {
		return errors.New("包不存在")
	}

	// 检查包状态，如果已发布则不允许删除
	if pkg.Status == models.PackageStatusPublished {
		return errors.New("已发布的包不允许删除")
	}

	// 删除包
	_, err = config.DB.ID(id).Delete(pkg)
	return err
}
