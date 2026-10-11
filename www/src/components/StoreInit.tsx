import { ReactElement, useEffect } from "react";
import { initNonCriticalStores, useStores } from "models";

export const InitNonCriticalStores = ({ children }: { children: ReactElement }) => {
  const { userStore } = useStores();

  useEffect(() => {
    initNonCriticalStores().catch((err) => {
      console.error("Failed to load the lookup stores:", err);
    });

    // Resolve the session once, up front. Every route is public now, so nothing else would ask
    // the server who we are -- without this a logged-in user would be stuck in view-only mode.
    userStore.isLoggedIn().catch(() => {
      // isLoggedIn already records the outcome; a rejection here just means we stay anonymous
    });
  }, [userStore]);

  return children;
};
