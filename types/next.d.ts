import 'next';
import { IUser } from '../api/models/User'; // Adjust path if necessary based on your User model location

declare module 'next' {
  interface NextApiRequest {
    user?: IUser; // Add the user property
    isAuthenticated(): boolean; // Add isAuthenticated method
    logout(callback: (err?: any) => void): void; // Add logout method if you use it from req.logout
    // Or more generically for logout / logIn if using promisified versions or different signatures:
    // logOut?(): void;
    // logIn?(user: any, options?: any, callback?: (err?: any) => void): void;
  }
}

// It's also common to augment the Express.User type if Passport is using it.
// If your IUser is compatible, you might not need this, or you might do:
// declare global {
//   namespace Express {
//     export interface User extends IUser {}
//   }
// }
