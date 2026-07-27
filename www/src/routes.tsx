import { NoArgsPathDef, NoURLArgsPathDef, applyLayout } from "gena-app";
import { EditorPage, LoginPage } from "./pages";
import { ExtendedRoute, Layout } from "./components/Layout";
import { Role } from "./components/RequiredAuthentication";
import { PUBLIC_URL } from "./env";
import { IFrame } from "pages/dashboard/IFrame";

const None = () => <h1>Not supposed to see this page</h1>;

/*************************************************************************************
 * Definitions for routes in this application
 */
export const routes = {
  login: new NoArgsPathDef({
    component: LoginPage,
    pathDef: `${PUBLIC_URL}/login`,
    exact: true,
  }),
  dashboard: new NoURLArgsPathDef({
    component: () => <IFrame relurl="/dashboard/" />,
    pathDef: `${PUBLIC_URL}/`,
    exact: true,
  }),
  mapview: new NoURLArgsPathDef({
    component: () => <IFrame relurl="/dashboard/mapview" />,
    pathDef: `${PUBLIC_URL}/map-view`,
    exact: true,
  }),
  gradeTonnage: new NoURLArgsPathDef({
    component: () => <IFrame relurl="/dashboard/gtmodel" />,
    pathDef: `${PUBLIC_URL}/grade-tonnage`,
    exact: true,
  }),
  mineralSite: new NoURLArgsPathDef({
    component: () => <IFrame relurl="/dashboard/mineralsite" />,
    pathDef: `${PUBLIC_URL}/mineral-site`,
    exact: true,
  }),
  byproduct: new NoURLArgsPathDef({
    component: () => <IFrame relurl="/dashboard/byproduct" />,
    pathDef: `${PUBLIC_URL}/byproduct`,
    exact: true,
  }),
  editor: new NoURLArgsPathDef({
    component: EditorPage,
    pathDef: `${PUBLIC_URL}/editor`,
    exact: true,
    querySchema: {
      commodity: "optionalstring",
      depositType: "optionalstring",
      country: "optionalstring",
      stateOrProvince: "optionalstring",
    },
  }),
};

(window as any)._routes = routes;

export const extendedRoutes: Record<keyof typeof routes, ExtendedRoute> = {
  login: {
    route: routes.login,
    role: Role.Public,
  },
  dashboard: {
    route: routes.dashboard,
    role: Role.Public,
  },
  mapview: {
    name: "Map View",
    route: routes.mapview,
    role: Role.Public,
  },
  gradeTonnage: {
    name: "Grade-Tonnage Model",
    route: routes.gradeTonnage,
    role: Role.Public,
  },
  mineralSite: {
    name: "Mineral Site Data",
    route: routes.mineralSite,
    role: Role.Public,
  },
  byproduct: {
    name: "By-Product Data",
    route: routes.byproduct,
    role: Role.Public,
  },
  editor: {
    name: "MinMod Editor",
    route: routes.editor,
    role: Role.User,
  },
};

// Apply the Layout to all routes
applyLayout(routes, (component, name, routes) => {
  return Layout({ component, name, routes, extendedRoutes });
});
