package services

import (
	"context"
	"fmt"
	"log"

	"luma-ai-backend/config"

	brevo "github.com/getbrevo/brevo-go/lib"
)

// EmailService 邮件服务结构体
type EmailService struct{}

var emailService = &EmailService{}

// SendVerificationCode 发送验证码邮件
func (es *EmailService) SendVerificationCode(toEmail, code string) error {
	// 检查Brevo配置是否可用
	if config.Brevo == nil || config.Brevo.Client == nil || config.Brevo.Sender == nil {
		log.Println("Brevo configuration is not available, skipping email sending")
		return nil // 配置不可用时返回nil而不是错误，避免影响业务流程
	}

	return es.SendEmail(toEmail, "CosCos - 验证码", fmt.Sprintf(`
		<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
			<h2 style="color: #333;">CosCos 验证码</h2>
			<p>您好！</p>
			<p>您的验证码是：</p>
			<div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 5px;">
				%s
			</div>
			<p>验证码有效期为5分钟，请尽快使用。</p>
			<p>如果您没有请求此验证码，请忽略此邮件。</p>
			<hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
			<p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
		</div>
	`, code))
}

func (es *EmailService) SendEmail(toEmail, subject, html string) error {
	email := brevo.SendSmtpEmail{
		Sender:      config.Brevo.Sender,
		To:          []brevo.SendSmtpEmailTo{{Email: toEmail}},
		Subject:     subject,
		HtmlContent: html,
	}
	_, httpResponse, err := config.Brevo.Client.TransactionalEmailsApi.SendTransacEmail(context.Background(), email)
	if err != nil {
		return fmt.Errorf("发送邮件失败: %v", err)
	}

	if httpResponse != nil && httpResponse.StatusCode >= 400 {
		return fmt.Errorf("发送邮件失败，状态码：%d", httpResponse.StatusCode)
	}
	return nil
}
