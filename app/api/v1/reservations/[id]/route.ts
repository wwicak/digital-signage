import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Reservation, { ReservationSchemaZod } from "@/lib/models/Reservation";
import Room from "@/lib/models/Room";
import { requireAuth } from "@/lib/auth";
import { hasPermission } from "@/lib/helpers/rbac_helper";
import { sendEventToDisplay } from "@/lib/sse_manager";
import mongoose from "mongoose";
import { getHttpStatusFromError, getErrorMessage } from "@/types/error";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    if (!hasPermission(user, { action: "update", resource: "reservation" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot update reservations" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid reservation ID format" },
        { status: 400 }
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

    const {
      title,
      room_id,
      location,
      start_time,
      end_time,
      organizer,
      attendees,
      agenda_meeting,
    } = validation.data;

    // Check if room exists
    const room = await Room.findById(room_id);
    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 });
    }

    // Check for conflicts (excluding current reservation)
    const conflictingReservations = await Reservation.find({
      _id: { $ne: id },
      room_id,
      $or: [
        {
          start_time: { $lt: new Date(end_time) },
          end_time: { $gt: new Date(start_time) },
        },
      ],
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

    // Find existing reservation
    const existingReservation = await Reservation.findById(id);
    if (!existingReservation) {
      return NextResponse.json(
        { message: "Reservation not found" },
        { status: 404 }
      );
    }

    // Update reservation
    const updatedReservation = await Reservation.findByIdAndUpdate(
      id,
      {
        title,
        room_id,
        location,
        start_time: new Date(start_time),
        end_time: new Date(end_time),
        organizer,
        attendees: attendees || [],
        agenda_meeting: agenda_meeting || "",
      },
      { new: true }
    ).populate({
      path: "room_id",
      populate: {
        path: "building_id",
        select: "name address",
      },
    });

    if (!updatedReservation) {
      return NextResponse.json(
        { message: "Reservation not found" },
        { status: 404 }
      );
    }

    // Send SSE event
    const reservationData = updatedReservation.toObject();
    sendEventToDisplay("all", "reservationUpdated", { ...reservationData });

    return NextResponse.json(updatedReservation);
  } catch (error: unknown) {
    console.error("Error updating reservation:", error);
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status: getHttpStatusFromError(error) }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const user = await requireAuth(request);

    if (!hasPermission(user, { action: "delete", resource: "reservation" })) {
      return NextResponse.json(
        { message: "Access denied: Cannot delete reservations" },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid reservation ID format" },
        { status: 400 }
      );
    }

    const reservation = await Reservation.findByIdAndDelete(id);
    
    if (!reservation) {
      return NextResponse.json(
        { message: "Reservation not found" },
        { status: 404 }
      );
    }

    // Send SSE event
    sendEventToDisplay("all", "reservationDeleted", { id });

    return NextResponse.json({ message: "Reservation deleted successfully" });
  } catch (error: unknown) {
    console.error("Error deleting reservation:", error);
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status: getHttpStatusFromError(error) }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    
    // For GET requests (viewing individual reservations), authentication is optional
    // This allows public displays to fetch reservation data
    // But we still check permissions if user is authenticated
    let user = null;
    try {
      user = await requireAuth(request);
      // If user is authenticated, check permissions
      if (user && !hasPermission(user, { action: "read", resource: "reservation" })) {
        return NextResponse.json(
          { message: "Access denied: Cannot view reservations" },
          { status: 403 }
        );
      }
    } catch (authError) {
      // If authentication fails, continue without user (public access)
      // This allows displays to fetch reservation data without authentication
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid reservation ID format" },
        { status: 400 }
      );
    }

    const reservation = await Reservation.findById(id).populate({
      path: "room_id",
      populate: {
        path: "building_id",
        select: "name address",
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { message: "Reservation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(reservation);
  } catch (error: unknown) {
    console.error("Error fetching reservation:", error);
    return NextResponse.json(
      { message: getErrorMessage(error) },
      { status: getHttpStatusFromError(error) }
    );
  }
}