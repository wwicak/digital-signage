import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Building from "@/lib/models/Building";
import Room from "@/lib/models/Room";
import Reservation from "@/lib/models/Reservation";
import UserCalendarLink from "@/lib/models/UserCalendarLink";
import { requireAuth } from "@/lib/helpers/auth_helper";
import { hasPermission } from "@/lib/helpers/rbac_helper";

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
      activeCalendarLinks,
      currentMeetings,
    ] = await Promise.all([
      Building.countDocuments({}),
      Room.countDocuments({}),
      Reservation.countDocuments({
        start_time: { $gte: today, $lt: tomorrow }
      }),
      Reservation.countDocuments({
        start_time: { $gte: thisWeekStart, $lt: thisWeekEnd }
      }),
      Reservation.countDocuments({
        start_time: { $gte: thisMonthStart, $lt: thisMonthEnd }
      }),
      UserCalendarLink.countDocuments({ isActive: true }),
      Reservation.countDocuments({
        start_time: { $lte: now },
        end_time: { $gte: now }
      }),
    ]);

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
                start_time: { $gte: thisWeekStart, $lt: thisWeekEnd }
              }
            }
          ]
        }
      },
      {
        $lookup: {
          from: "buildings",
          localField: "building_id",
          foreignField: "_id",
          as: "building"
        }
      },
      {
        $unwind: "$building"
      },
      {
        $project: {
          name: 1,
          capacity: 1,
          building_name: "$building.name",
          reservation_count: { $size: "$reservations" },
        }
      },
      {
        $sort: { reservation_count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const buildingStats = await Building.aggregate([
      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "building_id",
          as: "rooms"
        }
      },
      {
        $lookup: {
          from: "reservations",
          let: { roomIds: "$rooms._id" },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$room_id", "$$roomIds"] },
                start_time: { $gte: thisWeekStart, $lt: thisWeekEnd }
              }
            }
          ],
          as: "reservations"
        }
      },
      {
        $project: {
          name: 1,
          address: 1,
          room_count: { $size: "$rooms" },
          reservation_count: { $size: "$reservations" },
          total_capacity: { $sum: "$rooms.capacity" }
        }
      },
      {
        $sort: { reservation_count: -1 }
      }
    ]);

    const recentActivity = await Reservation.find({})
      .populate({
        path: "room_id",
        populate: {
          path: "building_id",
          select: "name"
        }
      })
      .sort({ creation_date: -1 })
      .limit(10)
      .select("title organizer start_time end_time creation_date room_id sourceCalendarType");

    const upcomingMeetings = await Reservation.find({
      start_time: { $gt: now }
    })
      .populate({
        path: "room_id",
        populate: {
          path: "building_id",
          select: "name"
        }
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
        activeCalendarLinks,
        currentMeetings,
      },
      roomUtilization,
      buildingStats,
      recentActivity,
      upcomingMeetings,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { message: error.message || "Error fetching dashboard data" },
      { status: error.status || 500 }
    );
  }
}
