import { observer } from "mobx-react-lite";
import { ReactElement, useEffect } from "react";
import { useStores } from "models";
import { routes } from "routes";
import { useLocation, useNavigate } from "react-router";

export enum Role {
  User,
  Public,
}

// where to send the user once they have logged in. routes.login takes no query args, so we stash
// the intended destination here instead of passing it through the URL.
export const REDIRECT_AFTER_LOGIN_KEY = "minmod.redirectAfterLogin";

export const setRedirectAfterLogin = (path: string): void => {
  try {
    sessionStorage.setItem(REDIRECT_AFTER_LOGIN_KEY, path);
  } catch (e) {
    // sessionStorage is unavailable in some privacy modes -- fall back to the default redirect
  }
};

export const takeRedirectAfterLogin = (): string | undefined => {
  try {
    const path = sessionStorage.getItem(REDIRECT_AFTER_LOGIN_KEY);
    sessionStorage.removeItem(REDIRECT_AFTER_LOGIN_KEY);
    return path === null ? undefined : path;
  } catch (e) {
    return undefined;
  }
};

export const RequiredAuthentication = observer(({ children, role }: { children: ReactElement; role: Role }) => {
  const { userStore } = useStores();
  const navigate = useNavigate();
  const location = useLocation();

  // check & login if not logged in
  useEffect(() => {
    userStore.isLoggedIn().then((isLoggedIn) => {
      if (!isLoggedIn) {
        setRedirectAfterLogin(location.pathname + location.search);
        routes.login.path().open(navigate);
      }
    });
  }, [userStore, navigate, location.pathname, location.search]);

  return children;
});
