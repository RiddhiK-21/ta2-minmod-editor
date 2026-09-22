import { useCallback, useEffect, useState } from "react";
import { routes } from "routes";
import { useStores } from "models";
import { useNavigate } from "react-router";
import { takeRedirectAfterLogin } from "components/RequiredAuthentication";
import { Button, Form, Input, FormProps, Alert } from "antd";

type LoginData = {
  username?: string;
  password?: string;
};

export const LoginPage = () => {
  const { userStore } = useStores();
  const navigate = useNavigate();

  const [error, setError] = useState<string>("");

  // return to whichever page bounced the user here, falling back to the editor
  const redirectAfterLogin = useCallback(() => {
    const next = takeRedirectAfterLogin();
    if (next !== undefined) {
      navigate(next);
      return;
    }
    routes.editor.path({ queryArgs: { commodity: undefined, depositType: undefined, country: undefined, stateOrProvince: undefined } }).open(navigate);
  }, [navigate]);

  useEffect(() => {
    userStore.isLoggedIn().then((isLoggedIn) => {
      if (isLoggedIn) redirectAfterLogin();
    });
  }, [userStore, redirectAfterLogin]);

  const onFinish: FormProps<LoginData>["onFinish"] = async (values: LoginData) => {
    if (values.username !== undefined && values.password !== undefined) {
      try {
        await userStore.login(values.username, values.password);
        redirectAfterLogin();
      } catch (err: any) {
        if (err.response?.status === 401) {
          setError("Username or password is wrong.");
        } else {
          setError("An error occurred. Please try again later.");
        }
      }
    }
  };

  return (
    <div>
      <div style={{ maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ textAlign: "center" }}>Login</h2>
          {error && <Alert message={error} type="error" showIcon />}
        </div>
        <Form name="basic" labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} style={{ maxWidth: 600 }} initialValues={{ remember: true }} onFinish={onFinish} autoComplete="off">
          <Form.Item<LoginData> label="Username" name="username" rules={[{ required: true, message: "Please input your username!" }]}>
            <Input />
          </Form.Item>

          <Form.Item<LoginData> label="Password" name="password" rules={[{ required: true, message: "Please input your password!" }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label={null}>
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};
