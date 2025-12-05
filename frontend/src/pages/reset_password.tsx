import { useState } from "react";
import { useNavigate } from "react-router";
import { Form, Input, Button, message, Card, Typography, Space } from "antd";
import {
  MailOutlined,
  LockOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import { api } from "@/lib/api";
import { router_login } from "@/lib/consts";

const { Title, Text } = Typography;

export default function ResetPassword() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter verification code and new password
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  // Request password reset verification code
  const handleRequestCode = async (values: { email: string }) => {
    setLoading(true);
    try {
      await api.user.requestPasswordReset({ email: values.email });
      setEmail(values.email);
      setStep(2);
      message.success("Verification code has been sent to your email, please check");
    } catch (error: any) {
      message.error(error.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  // Verify verification code and reset password
  const handleResetPassword = async (values: {
    email: string;
    code: string;
    new_password: string;
    confirm_password: string;
  }) => {
    if (values.new_password !== values.confirm_password) {
      message.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.user.verifyCodeAndResetPassword({
        email: values.email,
        code: values.code,
        new_password: values.new_password,
      });
      message.success("Password reset successful");
      navigate(router_login);
    } catch (error: any) {
      message.error(error.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black/30 border border-gray-700">
        <div className="text-center mb-6">
          <Title level={2} className="text-white">
            Reset Password
          </Title>
          <Text className="text-gray-400">
            {step === 1
              ? "Please enter your email address, we will send a verification code to your email"
              : "Please enter the verification code you received and your new password"}
          </Text>
        </div>

        {step === 1 ? (
          <Form form={form} onFinish={handleRequestCode} layout="vertical">
            <Form.Item
              name="email"
              rules={[
                { required: true, message: "Please enter your email address" },
                { type: "email", message: "Please enter a valid email address" },
              ]}
            >
              <Input
                prefix={<MailOutlined className="text-gray-500" />}
                placeholder="Email address"
                size="large"
                className="bg-black/20 border-gray-600 text-white"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                className="bg-purple-600 hover:bg-purple-700"
              >
                Send verification code
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Form form={form} onFinish={handleResetPassword} layout="vertical">
            <Form.Item
              name="email"
              initialValue={email}
              rules={[
                { required: true, message: "Please enter your email address" },
                { type: "email", message: "Please enter a valid email address" },
              ]}
            >
              <Input
                prefix={<MailOutlined className="text-gray-500" />}
                placeholder="Email address"
                size="large"
                disabled
                className="bg-black/20 border-gray-600 text-white"
              />
            </Form.Item>

            <Form.Item
              name="code"
              rules={[{ required: true, message: "Please enter verification code" }]}
            >
              <Input
                prefix={<SafetyCertificateOutlined className="text-gray-500" />}
                placeholder="Verification code"
                size="large"
                className="bg-black/20 border-gray-600 text-white"
              />
            </Form.Item>

            <Form.Item
              name="new_password"
              rules={[
                { required: true, message: "Please enter new password" },
                { min: 6, message: "Password must be at least 6 characters" },
                { max: 20, message: "Password must be at most 20 characters" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-500" />}
                placeholder="New password"
                size="large"
                className="bg-black/20 border-gray-600 text-white"
              />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              rules={[
                { required: true, message: "Please confirm new password" },
                { min: 6, message: "Password must be at least 6 characters" },
                { max: 20, message: "Password must be at most 20 characters" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-500" />}
                placeholder="Confirm new password"
                size="large"
                className="bg-black/20 border-gray-600 text-white"
              />
            </Form.Item>

            <Form.Item>
              <Space direction="vertical" className="w-full">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Reset password
                </Button>
                <Button
                  onClick={() => setStep(1)}
                  block
                  size="large"
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Resend verification code
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}

        <div className="text-center mt-4">
          <Button
            type="link"
            onClick={() => navigate(router_login)}
            className="text-purple-400 hover:text-purple-300"
          >
            Back to login
          </Button>
        </div>
      </Card>
    </div>
  );
}
