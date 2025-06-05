import express, { Request, Response, NextFunction, Application } from "express";
import Next from "next";
import mongoose from "mongoose";
import passport from "passport";
import cookieParser from "cookie-parser";
import session from "cookie-session";
import bodyParser from "body-parser";

import * as Keys from "./keys";
import User from "./api/models/User";
import { setupSwagger } from "./api/swagger";

const dev: boolean = Keys.ENVIRON !== "PROD";
const app = Next({ dev, dir: "." });
const handle = app.getRequestHandler();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const apiRoutes = require("./api/routes");

const server: Application = express();

server.use((req: Request, res: Response, nextFx: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  nextFx();
});

(mongoose as any).Promise = global.Promise;

if (!Keys.SESSION_SECRET) {
  console.error(
    "FATAL ERROR: SESSION_SECRET is not available. Application cannot start."
  );
  process.exit(1);
}

server.use(bodyParser.urlencoded({ extended: false }));
server.use(bodyParser.json());
server.use(cookieParser());
server.use(
  session({
    secret: Keys.SESSION_SECRET,
    name: "sessionId",
  })
);

// Use the directly imported and typed User model
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
server.use(passport.initialize());
server.use(passport.session());

// Setup Swagger documentation
setupSwagger(server);

// Legacy API routes for backward compatibility
server.use("/api/v1", apiRoutes);
server.use("/uploads", express.static("uploads"));

// Handle all other requests with Next.js
server.all("*", (req: Request, res: Response) => {
  return handle(req, res);
});

app
  .prepare()
  .then(() => {
    mongoose
      .connect(Keys.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      } as mongoose.ConnectOptions)
      .then(() => console.log("MongoDB connected successfully."))
      .catch((err) => {
        console.error("MongoDB connection error:", err);
        process.exit(1);
      });

    server.listen(Keys.PORT, (err?: any) => {
      if (err) throw err;
      console.log(
        `> Ready on http://localhost:${Keys.PORT} in ${Keys.ENVIRON} mode`
      );
    });
  })
  .catch((ex: any) => {
    console.error("Next.js app preparation error:", ex.stack);
    process.exit(1);
  });
