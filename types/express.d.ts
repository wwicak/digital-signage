import { IUser } from '../api/models/User'; // Adjust path if api/models/User.ts is elsewhere

declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface -- We are augmenting
    export interface User extends IUser {}
  }
}
