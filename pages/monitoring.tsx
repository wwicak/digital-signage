import React, { useEffect } from "react";
import Frame from "../components/Admin/Frame";
import DisplayMonitoringDashboard from "../components/Monitoring/DisplayMonitoringDashboard";
import { displayMonitoringService } from "@/lib/services/DisplayMonitoringService";

const MonitoringPage = () => {
  useEffect(() => {
    // Start the monitoring service when the page loads
    const initializeMonitoring = async () => {
      try {
        if (!displayMonitoringService.isServiceRunning()) {
          await displayMonitoringService.start();
          console.log("Display monitoring service started");
        }
      } catch (error) {
        console.error("Failed to start monitoring service:", error);
      }
    };

    initializeMonitoring();
  }, []);

  return (
    <Frame loggedIn={true}>
      <div className="container mx-auto py-6">
        <DisplayMonitoringDashboard />
      </div>
    </Frame>
  );
};

export default MonitoringPage;
