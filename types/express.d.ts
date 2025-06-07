import { IUser } from "../lib/models/User";

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface -- We are augmenting
    export interface User extends IUser {}
  }
}
