package middleware

import (
	"net/http"
	"os"
	"strings"
	"time"

	"luma-ai-backend/models"
	"luma-ai-backend/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
)

var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

// JWTClaims 自定义JWT声明
type JWTClaims struct {
	UserID   int64  `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
	jwt.RegisteredClaims
}

// GenerateToken 生成JWT token
func GenerateToken(user *models.User) (string, error) {
	// 设置token过期时间
	expirationTime := time.Now().Add(240 * time.Hour)

	claims := &JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		Email:    user.Email,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   "user_token",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// AuthMiddleware 认证中间件
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 先尝试从查询参数获取token
		tokenString := c.Query("token")

		// 如果查询参数中没有token，再从请求头获取
		if tokenString == "" {
			authHeader := c.GetHeader("Authorization")
			if authHeader == "" {
				utils.ResponseErr(c, "缺少认证头", http.StatusUnauthorized)
				c.Abort()
				return
			}

			// 检查Bearer前缀
			if strings.HasPrefix(authHeader, "Bearer ") {
				tokenString = authHeader[7:]
			} else {
				utils.ResponseErr(c, "无效的认证头", http.StatusUnauthorized)
				c.Abort()
				return
			}
		}

		// 解析token
		claims := &JWTClaims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil {
			utils.ResponseErr(c, "无效的token,请重新登陆", http.StatusUnauthorized)
			c.Abort()
			return
		}

		if !token.Valid {
			utils.ResponseErr(c, "token已过期或无效", http.StatusUnauthorized)
			c.Abort()
			return
		}

		// 将用户信息存储到上下文中
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("email", claims.Email)

		c.Next()
	}
}
