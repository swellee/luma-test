package middleware

import (
	"bytes"
	"io"
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// bodyLogWriter 定义一个存储响应数据的结构体
type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

// Write 重写Write方法，将响应数据写入body
func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// WriteHeader 重写WriteHeader方法
func (w bodyLogWriter) WriteHeader(statusCode int) {
	w.ResponseWriter.WriteHeader(statusCode)
}

// LoggingMiddleware 创建日志中间件
func LoggingMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 记录请求开始时间
		startTime := time.Now()

		// 读取请求体
		var requestBody []byte
		if c.Request.Body != nil {
			requestBody, _ = io.ReadAll(c.Request.Body)
			// 重新设置请求体，因为读取后会被清空
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// 创建一个自定义的ResponseWriter来捕获响应
		blw := &bodyLogWriter{
			ResponseWriter: c.Writer,
			body:           bytes.NewBufferString(""),
		}
		c.Writer = blw

		// 打印请求信息
		log.Printf("[GIN] | %s | %s | %s | %s | %s |",
			startTime.Format("2006/01/02 - 15:04:05"),
			c.Request.Method,
			c.Request.URL.Path,
			c.ClientIP(),
			string(requestBody))

		// 处理请求
		c.Next()

		// 计算处理时间
		duration := time.Since(startTime)

		// 打印响应信息
		log.Printf("[GIN] | %s | %s | %s | %d | %v | %s |",
			startTime.Format("2006/01/02 - 15:04:05"),
			c.Request.Method,
			c.Request.URL.Path,
			c.Writer.Status(),
			duration,
			blw.body.String())

	}
}