import { FetchResponse, RStore } from "gena-app";
import { SERVER } from "env";
import { action, makeObservable, observable, runInAction } from "mobx";
import axios from "axios";

type Role = "admin" | "user" | "system";

export interface User {
  id: string;
  url: string;
  email: string;
  name: string;
  role: Role;
}

export class UserStore extends RStore<string, User> {
  // id of the logged-in user. `records` is a shared cache that also holds other contributors
  // (fetched to show who edited what), so it cannot tell us who the viewer is.
  currentUserId: string | undefined = undefined;
  // whether we have asked the server about the session at least once
  sessionChecked: boolean = false;

  constructor() {
    super(`${SERVER}/api/v1/users`, { id: "username" }, false);
    makeObservable(this, {
      currentUserId: observable,
      sessionChecked: observable,
      setCurrentUser: action,
      clearCurrentUser: action,
    });
  }

  setCurrentUser(user: User) {
    this.set(user);
    this.currentUserId = user.id;
    this.sessionChecked = true;
  }

  clearCurrentUser() {
    this.currentUserId = undefined;
    this.sessionChecked = true;
  }

  async login(username: string, password: string) {
    let resp = await axios.post(`${SERVER}/api/v1/login`, { username, password });
    runInAction(() => {
      this.setCurrentUser(this.deserialize(resp.data));
    });
  }

  async isLoggedIn(): Promise<boolean> {
    if (this.currentUserId !== undefined) {
      return true;
    }

    try {
      const resp = await axios.get(`${SERVER}/api/v1/whoami`);
      runInAction(() => {
        this.setCurrentUser(this.deserialize(resp.data));
      });
      return true;
    } catch (err) {
      runInAction(() => {
        this.clearCurrentUser();
      });
      return false;
    }
  }
  public getCurrentUser(): User | undefined {
    if (this.currentUserId === undefined) return undefined;
    return this.records.get(this.currentUserId) ?? undefined;
  }

  public deserialize(obj: any): User {
    return {
      id: obj.username,
      email: obj.email,
      name: obj.name,
      url: obj.uri,
      role: obj.role,
    };
  }

  async logout() {
    const allCookies = document.cookie.split(";");
    for (let i = 0; i < allCookies.length; i++) {
      const cookie = allCookies[i];
      const eqPos = cookie.indexOf("=");
      const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
    runInAction(() => {
      this.records.clear();
      this.clearCurrentUser();
    });
  }

  protected normRemoteSuccessfulResponse(resp: any): FetchResponse {
    return { items: Array.isArray(resp.data) ? resp.data : Object.values(resp.data), total: resp.data.length };
  }
}
