package services

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"
	"sync"
	"time"

	"luma-ai-backend/config"
	"luma-ai-backend/models"

	"golang.org/x/crypto/bcrypt"
)

// VerificationCode 验证码结构
type VerificationCode struct {
	Code      string
	Email     string
	ExpiresAt time.Time
}

// CodeStore 验证码存储
type CodeStore struct {
	codes map[string]*VerificationCode
	mu    sync.RWMutex
}

// Set 设置验证码
func (cs *CodeStore) Set(email, code string) {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	cs.codes[email] = &VerificationCode{
		Code:      code,
		Email:     email,
		ExpiresAt: time.Now().Add(CodeExpireTime),
	}
}

// Get 获取验证码
func (cs *CodeStore) Get(email string) (string, bool) {
	cs.mu.RLock()
	defer cs.mu.RUnlock()

	code, exists := cs.codes[email]
	if !exists {
		return "", false
	}

	// 检查是否过期
	if time.Now().After(code.ExpiresAt) {
		// 过期则删除
		go cs.Delete(email)
		return "", false
	}

	return code.Code, true
}

// Delete 删除验证码
func (cs *CodeStore) Delete(email string) {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	delete(cs.codes, email)
}

// Cleanup 清理过期验证码
func (cs *CodeStore) Cleanup() {
	cs.mu.Lock()
	defer cs.mu.Unlock()

	now := time.Now()
	for email, code := range cs.codes {
		if now.After(code.ExpiresAt) {
			delete(cs.codes, email)
		}
	}
}

var (
	// 验证码有效期5分钟
	CodeExpireTime = 5 * time.Minute

	codeStore = &CodeStore{
		codes: make(map[string]*VerificationCode),
	}

	sysMsgService = &SysMsgService{}
)

// UserService 用户服务接口
type UserService struct{}

// HashPassword 密码加密
func (us *UserService) HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword 验证密码
func (us *UserService) CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// RegisterUser 用户注册
func (us *UserService) RegisterUser(req *models.UserRegisterRequest) (*models.User, error) {
	// 检查用户是否已存在
	existingUser := &models.User{}
	has, err := config.DB.Where("username = ?", req.Username).Get(existingUser)
	if err != nil {
		return nil, err
	}
	if has {
		return nil, errors.New("username is taken")
	}

	has, err = config.DB.Where("email = ?", req.Email).Get(existingUser)
	if err != nil {
		return nil, err
	}
	if has {
		return nil, errors.New("email is taken")
	}

	// 加密密码
	hashedPassword, err := us.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// 创建用户
	user := &models.User{
		Username: req.Username,
		Email:    req.Email,
		Password: hashedPassword,
		Role:     req.Role,
	}

	// 插入数据库
	_, err = config.DB.Insert(user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// LoginUser 用户登录
func (us *UserService) LoginUser(req *models.UserLoginRequest) (*models.User, error) {
	// 根据邮箱查找用户
	user := &models.User{}
	has, err := config.DB.Where("email = ?", req.Email).Get(user)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("user not found")
	}

	// 验证密码
	if !us.CheckPassword(req.Password, user.Password) {
		return nil, errors.New("password is incorrect")
	}

	return user, nil
}

// GetUserByID 根据ID获取用户信息
func (us *UserService) GetUserByID(id int64, asDailyLogin bool) (*models.UserResponse, error) {
	user := &models.User{}
	has, err := config.DB.ID(id).Get(user)
	if err != nil {
		return nil, err
	}
	if !has {
		return nil, errors.New("user not found")
	}

	userResp := &models.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		Avatar:    user.Avatar,
		Role:      user.Role,
		CreatedAt: user.CreatedAt,
	}

	return userResp, nil
}

func (us *UserService) UpdateProfile(userID int64, req *models.UserUpdateReq) (*models.UserResponse, error) {

	user := &models.User{}
	has, err := config.DB.Where("username = ?", req.Username).Get(user)
	if user.ID != userID && has {
		return nil, errors.New("nickname is already taken")
	}
	if err != nil {
		return nil, err
	}

	// 准备要更新的字段
	user.Username = req.Username
	user.Avatar = req.Avatar

	// 使用Cols方法明确指定要更新的字段，这样即使是空字符串也会被更新到数据库
	_, err = config.DB.ID(userID).Cols("username", "avatar").Update(user)
	if err != nil {
		return nil, err
	}

	response := &models.UserResponse{
		ID:        user.ID,
		Username:  user.Username,
		Email:     user.Email,
		Avatar:    user.Avatar,
		Role:      user.Role,
		CreatedAt: user.CreatedAt,
	}
	return response, nil
}

func (us *UserService) GetUserByIDByEmail(email string) (int64, error) {
	var user models.User
	_, err := config.DB.Where("email = ?", email).Cols("id").Get(&user)
	return user.ID, err
}

// GenerateVerificationCode 生成6位数字验证码
func (us *UserService) GenerateVerificationCode() (string, error) {
	// 生成6位数字验证码
	code, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}

	// 确保是6位数字（前面补0）
	return fmt.Sprintf("%06d", code.Int64()), nil
}

// SendVerificationCode 发送验证码到邮箱（基于Redis实现）
func (us *UserService) SendVerificationCode(email, reason string) error {
	ctx := context.Background()

	// 生成验证码
	code, err := us.GenerateVerificationCode()
	if err != nil {
		return errors.New("failed to generate verification code")
	}
	// 如果Redis客户端可用，使用Redis存储验证码
	if config.Redis != nil {
		err := config.Redis.Set(ctx, fmt.Sprintf("%s_code:%s", reason, email), code, CodeExpireTime).Err()
		if err != nil {
			log.Printf("Failed to store verification code in Redis: %v", err)
			// Redis存储失败时回退到内存存储
			codeStore.Set(email, code)
		}
	} else {
		// Redis不可用时使用内存存储
		codeStore.Set(email, code)
	}

	// TODO: 实际使用阿里云邮件推送服务发送邮件
	fmt.Printf("Sending verification code %s to email %s\n", code, email)
	return emailService.SendVerificationCode(email, code)
}

// VerifyCode 验证验证码（基于Redis实现）
func (us *UserService) VerifyCode(email, reason string, code string) error {
	ctx := context.Background()
	var err error

	// 如果Redis客户端可用，从Redis获取验证码
	if config.Redis != nil {
		_, err = config.Redis.Get(ctx, fmt.Sprintf("%s_code:%s", reason, email)).Result()
		if err != nil {
			// Redis获取失败时尝试从内存获取
			var exists bool
			_, exists = codeStore.Get(email)
			if !exists {
				return errors.New("verification code not found")
			}
		}
	} else {
		// Redis不可用时从内存获取
		var exists bool
		_, exists = codeStore.Get(email)
		if !exists {
			return errors.New("verification code not found")
		}
	}

	return nil
}

// ResetPassword 重置密码（基于Redis实现）
func (us *UserService) ResetPassword(email, newPassword string) error {
	// 检查用户是否存在
	user := &models.User{}
	has, err := config.DB.Where("email = ?", email).Get(user)
	if err != nil {
		return err
	}
	if !has {
		return errors.New("user not found")
	}

	// 加密新密码
	hashedPassword, err := us.HashPassword(newPassword)
	if err != nil {
		return err
	}

	// 更新密码
	user.Password = string(hashedPassword)
	_, err = config.DB.ID(user.ID).Update(user)
	if err != nil {
		return err
	}

	// 删除验证码
	ctx := context.Background()
	if config.Redis != nil {
		// 尝试从Redis删除
		err = config.Redis.Del(ctx, fmt.Sprintf("reset_code:%s", email)).Err()
		if err != nil {
			// Redis删除失败时从内存删除
			codeStore.Delete(email)
		}
	} else {
		// Redis不可用时从内存删除
		codeStore.Delete(email)
	}

	return nil
}

// GetUserList 获取用户列表
func (us *UserService) GetUserList(page, pageSize int) (*models.UserListResponse, error) {
	var users []models.User

	// 计算偏移量
	offset := (page - 1) * pageSize

	// 获取用户列表
	err := config.DB.Limit(pageSize, offset).Find(&users)
	if err != nil {
		return nil, err
	}

	// 获取总用户数
	total, err := config.DB.Count(&models.User{})
	if err != nil {
		return nil, err
	}

	// 转换为 UserResponse 列表
	userResponses := make([]models.UserResponse, len(users))
	for i, user := range users {
		userResponses[i] = models.UserResponse{
			ID:        user.ID,
			Username:  user.Username,
			Email:     user.Email,
			Avatar:    user.Avatar,
			Role:      user.Role,
			CreatedAt: user.CreatedAt,
		}
	}

	return &models.UserListResponse{
		List:  userResponses,
		Total: total,
	}, nil
}
