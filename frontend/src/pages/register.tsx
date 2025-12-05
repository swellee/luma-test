import { api } from "@/lib/api";
import { roleOpts, router_login, router_terms } from "@/lib/consts";
import { Role } from "@/lib/types";
import { useUserStore } from "@/store/user_store";
import { Button, Checkbox, Form, Input, message, Select } from "antd";
import { useWatch } from "antd/es/form/Form";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

export default function Register() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formEmail] = Form.useForm();
  const [formVerify] = Form.useForm();
  const [formRegister] = Form.useForm();
  const email = useWatch("email", formEmail);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [agree, setAgree] = useState(true);
  const isDev = import.meta.env.MODE === "development";
  const allowAdmin = import.meta.env.VITE_ALLOW_ADMIN_REGISTER === "true";
  const { setUser, setToken } = useUserStore((state) => state);

  const handleSendCode = async (values: { email: string }) => {
    if(isDev){
      setCurrentStep(2);
      return;
    }
    const res = await api.user.sendVerifyCode(values.email, true);
    if (res.success) {
      message.success("verify code sent to your email");
      setCurrentStep(1);
    }
  };

  const handleChangeEmail = () => {
    formEmail.resetFields();
    setCurrentStep(0);
  };
  const handleVerify = async (values: { email: string; code: string }) => {
    const res = await api.user.checkVerifyCode(email, values.code);
    if (res?.success) {
      setCurrentStep(2);
    }
  };
  const handleResendCode = () => {
    if (email) {
      handleSendCode({ email });
    }
  };
  const handleRegister = async (values: {
    username: string;
    password: string;
    confirmPassword: string;
    role: Role;
  }) => {
    setLoading(true);
    try {
      // Password confirmation check
      if (values.password !== values.confirmPassword) {
        message.error("Passwords do not match");
        setLoading(false);
        return;
      }

      const response = await api.user.register({
        username: values.username,
        email: email,
        password: values.password,
        role: values.role,
      });

      setToken(response.token);
      setUser(response.user);
      message.success("Registration successful");
      formRegister.resetFields();
      navigate("/");
    } catch (error) {
      console.error("An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="w-full md:flex h-screen p-4 md:p-[100px]">
      <div className="hidden relative bg-linear-to-br from-indigo/30 via-sky/80 to-sky/30 md:flex flex-3 overflow-hidden p-4 md:p-16 pt-[100px] md:pt-[200px] shadow-2xl rounded-sm">
        <img
          src="https://gips1.baidu.com/it/u=112193661,2737838585&fm=3074&app=3074&f=PNG?w=2560&h=1440"
          alt=""
          className="h-full w-full absolute inset-0 z-0"
        />
        <h1 className="relative z-1 text-white text-4xl! md:text-[80px]!">
          Luma labs
        </h1>
        <div className="relative z-1 font-chat p-4 md:p-8 rounded-2xl w-full md:w-4/5 text-white text-sm md:text-lg">
          Make it with Dream Machine
        </div>
      </div>
      
      <div className="bg-white/40 flex flex-col w-full md:flex-4 md:w-1/2 items-center justify-center p-4 md:p-8 md:rounded-sm">
        <div className="w-full md:w-3/5">
          <Form
            hidden={currentStep !== 0}
            form={formEmail}
            onFinish={handleSendCode}
            layout="vertical"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please enter your email" },
                { type: "email", message: "Please enter a valid email address" },
              ]}
            >
              <Input type="email" placeholder="Please enter your email" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block>
              Next
            </Button>
          </Form>
          <Form
            form={formVerify}
            hidden={currentStep !== 1}
            onFinish={handleVerify}
            layout="vertical"
          >
            <h3 className="text-sm text-gray-500">
              Please enter the verification code sent to {email}. Didn't receive it?
              <Button size="small" type="link" onClick={handleResendCode}>
                Resend
              </Button>
              or
              <Button size="small" type="link" onClick={handleChangeEmail}>
                Change email
              </Button>
            </h3>

            <Form.Item
              name="code"
              rules={[
                { required: true, message: "Please enter the 6-digit verification code" },
                { min: 6, max: 6, message: "Verification code must be 6 digits" },
              ]}
            >
              <Input.Password placeholder="Please enter verification code" />
            </Form.Item>
            <Button type="primary" htmlType="submit" className="w-full">
              Submit verification
            </Button>
          </Form>
          <Form
            form={formRegister}
            hidden={currentStep != 2}
            onFinish={handleRegister}
            layout="vertical"
          >
            <h3 className="text-sm text-gray-500 mb-4">
              Verification successful! Complete your registration
            </h3>
            <Form.Item
              name="password"
              label="Set password"
              rules={[{ required: true, message: "Please enter your password" }]}
            >
              <Input.Password placeholder="Please enter your password" />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label="Confirm password"
              rules={[{ required: true, message: "Please confirm your password" }]}
              dependencies={["password"]}
            >
              <Input.Password placeholder="Please enter your password again" />
            </Form.Item>

            <Form.Item
              name="username"
              label="Nickname"
              rules={[
                { required: true, message: "Please enter your nickname", min: 2, max: 20 },
              ]}
            >
              <Input placeholder="Please enter your nickname" />
            </Form.Item>

            <Form.Item
              label="Role"
              name="role"
              rules={[{ required: true, message: "Please select a role" }]}
            >
              <Select options={roleOpts(allowAdmin)} placeholder="Please select a role" />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                disabled={!agree}
                loading={loading}
                block
              >
                Register
              </Button>
            </Form.Item>
            <Checkbox
              checked={agree}
              className="relative -top-4"
              onChange={(e) => setAgree(e.target.checked)}
            >
              I have read and agree to the
              <Link to={router_terms} target="_blank">
                Terms of Service
              </Link>
            </Checkbox>
          </Form>
        </div>
          <div className="text-center mt-4">
            <div className="flex flex-col md:flex-row justify-between gap-2 mb-4">
              <div className="text-sm">Already have an account?</div>

              <Button
                type="link"
                size="small"
                className="block text-xs md:text-sm"
                onClick={() => navigate(router_login)}
              >
                <span className="text-normal">Login now</span>
              </Button>
              <Button
                type="link"
                size="small"
                className="text-xs md:text-sm"
                href="/"
              >
                <span className="text-normal">Back to home</span>
              </Button>
            </div>
          </div>
      </div>
    </div>
  );
}
