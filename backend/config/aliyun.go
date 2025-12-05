package config

import (
	"os"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
)

type AliyunConfig struct {
	AccessID   string
	AccessKey  string
	BucketName string
	Endpoint   string
	Domain     string
}

var Aliyun AliyunConfig

func InitAliyun() {
	Aliyun = AliyunConfig{
		AccessID:   os.Getenv("ALIYUN_ACCESS_ID"),
		AccessKey:  os.Getenv("ALIYUN_ACCESS_SECRET"),
		BucketName: os.Getenv("ALIYUN_BUCKET_NAME"),
		Endpoint:   os.Getenv("ALIYUN_ENDPOINT"),
		Domain:     os.Getenv("ALIYUN_DOMAIN"),
	}
}

// GetOSSClient 创建OSS客户端
func GetOSSClient() (*oss.Client, error) {
	client, err := oss.New(Aliyun.Endpoint, Aliyun.AccessID, Aliyun.AccessKey)
	if err != nil {
		return nil, err
	}
	return client, nil
}

// GetOSSBucket 获取存储空间
func GetOSSBucket() (*oss.Bucket, error) {
	client, err := GetOSSClient()
	if err != nil {
		return nil, err
	}

	bucket, err := client.Bucket(Aliyun.BucketName)
	if err != nil {
		return nil, err
	}
	return bucket, nil
}