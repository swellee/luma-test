import { api } from "@/lib/api";
import { router_register, router_reset_password } from "@/lib/consts";
import { useUserStore } from "@/store/user_store";
import { Button, Form, Input } from "antd";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { setToken, setUser } = useUserStore();
  const [form] = Form.useForm();

  const [searchParams] = useSearchParams();
  const targetPath = searchParams.get("to") || "/";

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const response = await api.user.login(values);

      // The http function has already processed the response, use the returned data directly
      setToken(response.token);
      setUser(response.user);
      form.resetFields();
      navigate(targetPath || "/"); // After successful login, redirect to the original target page or home page
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = (errorInfo: any) => {
    console.log("Failed:", errorInfo);
  };

  return (
    <div className="w-full md:flex h-screen p-4 md:p-[100px]">
      <div className="relative bg-linear-to-br from-indigo/30 via-sky/80 to-sky/30 md:flex flex-3 overflow-hidden p-4 md:p-16 pt-[100px] md:pt-[200px] shadow-2xl rounded-sm">
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
            form={form}
            onFinish={handleLogin}
            onFinishFailed={onFinishFailed}
            layout="vertical"
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please enter your email" },
                {
                  type: "email",
                  message: "Please enter a valid email address",
                },
              ]}
            >
              <Input type="email" placeholder="Please enter your email" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: "Please enter your password" },
              ]}
            >
              <Input.Password placeholder="Please enter your password" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Login
              </Button>
            </Form.Item>

            <div className="text-center">
              <div className="flex flex-col md:flex-row justify-between gap-2 mb-4">
                <Button
                  type="text"
                  size="small"
                  className="text-xs md:text-sm"
                  onClick={() =>
                    navigate(
                      router_register +
                        (targetPath ? `?${searchParams.toString()}` : "")
                    )
                  }
                >
                  <span className="text-normal">Register now</span>
                </Button>
                <Button
                  type="text"
                  size="small"
                  className="text-xs md:text-sm"
                  onClick={() => navigate(router_reset_password)}
                >
                  <span className="text-normal">Forgot password?</span>
                </Button>
                <Button
                  type="text"
                  size="small"
                  className="text-xs md:text-sm"
                  href="/"
                >
                  <span className="text-normal">Back to home</span>
                </Button>
              </div>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
