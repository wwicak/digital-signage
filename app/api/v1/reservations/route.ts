import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Reservation, { ReservationSchemaZod } from "@/lib/models/Reservation";
import Room from "@/lib/models/Room";
import { requireAuth } from "@/lib/helpers/auth_helper";
import { hasPermission } from "@/lib/helpers/rbac_helper";
import { sendEventToDisplay } from "@/lib/sse_manager";
import mongoose from "mongoose";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    if (!hasPermission(user, { action: "read", resource: "reservation" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot view reservations" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const roomId = searchParams.get("room_id");
    const buildingId = searchParams.get("building_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const skip = (page - 1) * limit;

    let query: any = {};

    if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
      query.room_id = roomId;
    }

    if (buildingId && mongoose.Types.ObjectId.isValid(buildingId)) {
      const rooms = await Room.find({ building_id: buildingId }).select("_id");
      const roomIds = rooms.map(room => room._id);
      query.room_id = { $in: roomIds };
    }

    if (startDate || endDate) {
      query.$and = [];
      if (startDate) {
        query.$and.push({ end_time: { $gte: new Date(startDate) } });
      }
      if (endDate) {
        query.$and.push({ start_time: { $lte: new Date(endDate) } });
      }
    }

    const reservations = await Reservation.find(query)
      .populate({
        path: "room_id",
        populate: {
          path: "building_id",
          select: "name address"
        }
      })
      .skip(skip)
      .limit(limit)
      .sort({ start_time: 1 });

    const total = await Reservation.countDocuments(query);

    return NextResponse.json({
      reservations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      { message: error.message || "Error fetching reservations" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    if (!hasPermission(user, { action: "create", resource: "reservation" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot create reservations" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = ReservationSchemaZod.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Validation error",
          errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { title, room_id, start_time, end_time, organizer, attendees, agenda_meeting } = validation.data;

    const room = await Room.findById(room_id);
    if (!room) {
      return NextResponse.json(
        { message: "Room not found" },
        { status: 404 }
      );
    }

    // Check for conflicts
    const conflictingReservations = await Reservation.find({
      room_id,
      $or: [
        {
          start_time: { $lt: end_time },
          end_time: { $gt: start_time }
        }
      ]
    });

    if (conflictingReservations.length > 0) {
      return NextResponse.json(
        {
          message: "Room is already booked for the requested time slot",
          conflictingReservations,
        },
        { status: 409 }
      );
    }

    const reservation = new Reservation({
      title,
      room_id,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      organizer,
      attendees: attendees || [],
      agenda_meeting: agenda_meeting || "",
    });

    await reservation.save();
    await reservation.populate({
      path: "room_id",
      populate: {
        path: "building_id",
        select: "name address"
      }
    });

    sendEventToDisplay("all", "reservationCreated", reservation);

    return NextResponse.json(reservation, { status: 201 });
  } catch (error: any) {
    console.error("Error creating reservation:", error);
    return NextResponse.json(
      { message: error.message || "Error creating reservation" },
      { status: error.status || 500 }
    );
  }
}
