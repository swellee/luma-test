package utils

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type SuccessSimpleRes struct {
	Success bool `json:"success"`
}

type Response struct {
	Code  int         `json:"code"`
	Data  interface{} `json:"data,omitempty"`
	Error string      `json:"error,omitempty"`
}

func ResponseOk(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code: http.StatusOK,
		Data: data,
	})
}
func ResponseErr(c *gin.Context, err string, code int) {
	c.JSON(code, Response{
		Code:  code,
		Error: err,
	})
}

func ResponseSuccess(c *gin.Context) {
	c.JSON(200, Response{
		Code: 200,
		Data: &SuccessSimpleRes{
			Success: true,
		},
	})
}

// ParseInt64 将字符串转换为int64
func ParseInt64(str string) (int64, error) {
	return strconv.ParseInt(str, 10, 64)
}
