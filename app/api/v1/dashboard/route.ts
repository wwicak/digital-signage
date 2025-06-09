import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Building from "@/lib/models/Building";
import Room from "@/lib/models/Room";
import Reservation from "@/lib/models/Reservation";
import UserCalendarLink from "@/lib/models/UserCalendarLink";
import { requireAuth } from "@/lib/helpers/auth_helper";
import { hasPermission } from "@/lib/helpers/rbac_helper";

// Force dynamic rendering to prevent static generation errors
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    if (!hasPermission(user, { action: "read", resource: "dashboard" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot view dashboard" },
        { status: 403 }
      );
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisWeekEnd = new Date(thisWeekStart);
    thisWeekEnd.setDate(thisWeekStart.getDate() + 7);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalBuildings,
      totalRooms,
      totalReservationsToday,
      totalReservationsThisWeek,
      totalReservationsThisMonth,
      _totalCalendarLinks,
      _activeCalendarLinks,
      currentMeetings,
      upcomingMeetingsToday,
    ] = await Promise.all([
      Building.countDocuments({}),
      Room.countDocuments({}),
      Reservation.countDocuments({
        start_time: { $gte: today, $lt: tomorrow },
      }),
      Reservation.countDocuments({
        start_time: { $gte: thisWeekStart, $lt: thisWeekEnd },
      }),
      Reservation.countDocuments({
        start_time: { $gte: thisMonthStart, $lt: thisMonthEnd },
      }),
      UserCalendarLink.countDocuments({}),
      UserCalendarLink.countDocuments({ isActive: true }),
      Reservation.countDocuments({
        start_time: { $lte: now },
        end_time: { $gte: now },
      }),
      Reservation.countDocuments({
        start_time: { $gte: now, $lt: tomorrow },
      }),
    ]);

    // Calculate calendar integration statistics
    const calendarSyncStats = await UserCalendarLink.aggregate([
      {
        $group: {
          _id: null,
          totalConnections: { $sum: 1 },
          activeConnections: {
            $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
          },
          successfulSyncs: {
            $sum: { $cond: [{ $eq: ["$lastSyncStatus", "success"] }, 1, 0] },
          },
          totalSyncs: {
            $sum: { $cond: [{ $ne: ["$lastSyncStatus", null] }, 1, 0] },
          },
        },
      },
    ]);

    const calendarStats = calendarSyncStats[0] || {
      totalConnections: 0,
      activeConnections: 0,
      successfulSyncs: 0,
      totalSyncs: 0,
    };

    const syncSuccessRate =
      calendarStats.totalSyncs > 0
        ? Math.round(
            (calendarStats.successfulSyncs / calendarStats.totalSyncs) * 100
          )
        : 100;

    // Calculate average reservations per day for this month
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
    const averageReservationsPerDay = Math.round(
      totalReservationsThisMonth / daysInMonth
    );

    // Calculate room utilization rate
    const roomsWithReservationsToday = await Room.aggregate([
      {
        $lookup: {
          from: "reservations",
          localField: "_id",
          foreignField: "room_id",
          as: "todayReservations",
          pipeline: [
            {
              $match: {
                start_time: { $gte: today, $lt: tomorrow },
              },
            },
          ],
        },
      },
      {
        $match: {
          "todayReservations.0": { $exists: true },
        },
      },
      {
        $count: "roomsUsed",
      },
    ]);

    const roomsUsedToday = roomsWithReservationsToday[0]?.roomsUsed || 0;
    const roomUtilizationRate =
      totalRooms > 0 ? Math.round((roomsUsedToday / totalRooms) * 100) : 0;

    const roomUtilization = await Room.aggregate([
      {
        $lookup: {
          from: "reservations",
          localField: "_id",
          foreignField: "room_id",
          as: "reservations",
          pipeline: [
            {
              $match: {
                start_time: { $gte: today, $lt: tomorrow },
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "buildings",
          localField: "building_id",
          foreignField: "_id",
          as: "building",
        },
      },
      {
        $unwind: "$building",
      },
      {
        $addFields: {
          reservationCount: { $size: "$reservations" },
          totalDuration: {
            $sum: {
              $map: {
                input: "$reservations",
                as: "reservation",
                in: {
                  $divide: [
                    {
                      $subtract: [
                        "$$reservation.end_time",
                        "$$reservation.start_time",
                      ],
                    },
                    3600000, // Convert milliseconds to hours
                  ],
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          utilizationPercentage: {
            $cond: [
              { $gt: ["$reservationCount", 0] },
              { $multiply: [{ $divide: ["$totalDuration", 8] }, 100] }, // Assuming 8-hour workday
              0,
            ],
          },
        },
      },
      {
        $project: {
          roomName: "$name",
          buildingName: "$building.name",
          reservationCount: 1,
          totalDuration: { $round: ["$totalDuration", 1] },
          utilizationPercentage: { $round: ["$utilizationPercentage", 0] },
        },
      },
      {
        $match: {
          reservationCount: { $gt: 0 },
        },
      },
      {
        $sort: { utilizationPercentage: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    const buildingStats = await Building.aggregate([
      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "building_id",
          as: "rooms",
        },
      },
      {
        $lookup: {
          from: "reservations",
          let: { roomIds: "$rooms._id" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$room_id", "$$roomIds"] },
                start_time: { $gte: thisMonthStart, $lt: thisMonthEnd },
              },
            },
          ],
          as: "reservations",
        },
      },
      {
        $project: {
          buildingName: "$name",
          reservationCount: { $size: "$reservations" },
        },
      },
      {
        $match: {
          reservationCount: { $gt: 0 },
        },
      },
      {
        $sort: { reservationCount: -1 },
      },
    ]);

    const recentActivity = await Reservation.find({})
      .populate({
        path: "room_id",
        populate: {
          path: "building_id",
          select: "name",
        },
      })
      .sort({ creation_date: -1 })
      .limit(10)
      .select(
        "title organizer start_time end_time creation_date room_id sourceCalendarType"
      );

    const _upcomingMeetings = await Reservation.find({
      start_time: { $gt: now },
    })
      .populate({
        path: "room_id",
        populate: {
          path: "building_id",
          select: "name",
        },
      })
      .sort({ start_time: 1 })
      .limit(5)
      .select("title organizer start_time end_time room_id");

    return NextResponse.json({
      overview: {
        totalBuildings,
        totalRooms,
        totalReservationsToday,
        totalReservationsThisWeek,
        totalReservationsThisMonth,
        currentMeetings,
        upcomingMeetingsToday,
        averageReservationsPerDay,
        roomUtilizationRate,
      },
      calendarIntegration: {
        totalConnections: calendarStats.totalConnections,
        activeConnections: calendarStats.activeConnections,
        syncSuccessRate,
      },
      roomUtilization,
      buildingStats,
      recentActivity,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { message: error.message || "Error fetching dashboard data" },
      { status: error.status || 500 }
    );
  }
}
