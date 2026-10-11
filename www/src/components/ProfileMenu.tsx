import React from "react";
import { Dropdown, Avatar, Button, MenuProps } from "antd";
import { useStores } from "models";
import { useLocation, useNavigate } from "react-router";
import { UserOutlined, LogoutOutlined, LoginOutlined } from "@ant-design/icons";
import { observer } from "mobx-react-lite";
import { getActiveRouteName } from "gena-app";
import { routes } from "routes";
import { setRedirectAfterLogin } from "./RequiredAuthentication";

export const ProfileMenu: React.FC = observer(() => {
  const { userStore } = useStores();
  const navigate = useNavigate();
  const location = useLocation();
  const user = userStore.getCurrentUser();

  // until we know whether there is a session, show nothing rather than flashing "Login" at
  // someone who is in fact logged in
  if (!userStore.sessionChecked) {
    return <></>;
  }

  if (user === undefined) {
    // logging in only unlocks the editor, so only offer it there -- not on the public dashboard
    // tabs, and not on the login page itself
    if (getActiveRouteName(location, routes) !== "editor") {
      return <></>;
    }
    const handleLogin = () => {
      // so that LoginPage returns us to the page we were viewing
      setRedirectAfterLogin(location.pathname + location.search);
      routes.login.path().open(navigate);
    };
    return (
      <Button type="primary" icon={<LoginOutlined />} onClick={handleLogin}>
        Login
      </Button>
    );
  }

  const menu: MenuProps["items"] = [
    {
      key: "logout",
      label: "Logout",
      icon: <LogoutOutlined />,
    },
  ];

  const handleMenuClick = (e: { key: string }) => {
    if (e.key === "logout") {
      userStore.logout();
      // the editor is public, so logging out just drops back into view-only mode
      routes.editor.path({ queryArgs: { commodity: undefined, depositType: undefined, country: undefined, stateOrProvince: undefined } }).open(navigate);
    }
  };

  return (
    <Dropdown menu={{ items: menu, onClick: handleMenuClick }} placement="bottomRight" trigger={["click"]}>
      <Button type="text" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <Avatar icon={<UserOutlined />} style={{ backgroundColor: "#1890ff", verticalAlign: "middle" }} />
        {user.name}
      </Button>
    </Dropdown>
  );
});
