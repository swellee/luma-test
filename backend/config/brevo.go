package config

import (
	"os"

	brevo "github.com/getbrevo/brevo-go/lib"
)

type BrevoCfg struct {
	Client *brevo.APIClient
	Sender *brevo.SendSmtpEmailSender
}

var Brevo *BrevoCfg

func InitBrevo() {
	// 配置Brevo API密钥
	cfg := brevo.NewConfiguration()
	apiKey := os.Getenv("BREVO_API_KEY")
	//Configure API key authorization: api-key
	cfg.AddDefaultHeader("api-key", apiKey)
	//Configure API key authorization: partner-key
	cfg.AddDefaultHeader("partner-key", apiKey)

	// 创建客户端
	client := brevo.NewAPIClient(cfg)

	// 获取发件人信息
	sender := os.Getenv("BREVO_SENDER")
	senderName := os.Getenv("BREVO_SENDER_NAME")

	Brevo = &BrevoCfg{
		Client: client,
		Sender: &brevo.SendSmtpEmailSender{
			Email: sender,
			Name:  senderName,
		},
	}
}
