import express, { Router } from "express";

// Import other route modules (now as .ts)
import displayRoutes from "./display";
import slideRoutes from "./slide";
import slideshowRoutes from "./slideshow";
import userRoutes from "./user";
import widgetRoutes from "./widgets";
// Import new meeting room management routes
import buildingRoutes from "./buildings";
import roomRoutes from "./rooms";
import reservationRoutes from "./reservations";
import scheduleRoutes from "./schedule";
// Import calendar integration routes
import calendarIntegrationRoutes from "./calendar_integration";

const router: Router = express.Router();

// Health check or API root endpoint
router.get("/", (req, res) => {
  res.json({
    message: "API is working!",
    version: "v1", // Or some other version info
  });
});

// Mount existing routes
router.use("/displays", displayRoutes);
router.use("/slides", slideRoutes);
router.use("/slideshows", slideshowRoutes);
router.use("/users", userRoutes);
router.use("/widgets", widgetRoutes);

// Mount new meeting room management routes
router.use("/buildings", buildingRoutes);
router.use("/rooms", roomRoutes);
router.use("/reservations", reservationRoutes);
router.use("/schedule", scheduleRoutes);

// Mount calendar integration routes
router.use("/calendar", calendarIntegrationRoutes);

export default router;
