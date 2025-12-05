package utils

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

// SSE Server-Sent Events 结构体
type SSE struct {
	Data interface{}
}

// Render 实现gin的Render接口
func (s SSE) Render(w http.ResponseWriter) error {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	var data string
	switch v := s.Data.(type) {
	case string:
		data = v
	default:
		jsonData, err := json.Marshal(v)
		if err != nil {
			return err
		}
		data = string(jsonData)
	}

	// 格式化为SSE消息格式
	_, err := fmt.Fprintf(w, "data: %s\n\n", strings.ReplaceAll(data, "\n", "\ndata: "))
	return err
}

// WriteContentType 实现gin的Render接口
func (s SSE) WriteContentType(w http.ResponseWriter) {
	w.Header().Set("Content-Type", "text/event-stream")
}