// Export all models for centralized access

// User model exports
export { default as User } from "./User";
export type { IUser, IUserModel } from "./User";
export { UserSchemaZod } from "./User";

// Display model exports
export { default as Display } from "./Display";
export type { IDisplay } from "./Display";
export { DisplaySchemaZod, StatusBarSchemaZod } from "./Display";

// Slide model exports
export { default as Slide } from "./Slide";
export type {
  ISlide,
  SlideData,
  ImageSlideData,
  VideoSlideData,
  WebSlideData,
  MarkdownSlideData,
  PhotoSlideData,
  YoutubeSlideData,
} from "./Slide";
export { SlideSchemaZod, SlideType, SlideTypeZod } from "./Slide";

// Slideshow model exports
export { default as Slideshow } from "./Slideshow";

// Widget model exports
export { default as Widget } from "./Widget";
export type { IWidget } from "./Widget";

// Meeting room management models
export { default as Building } from "./Building";
export type { IBuilding } from "./Building";
export { BuildingSchemaZod } from "./Building";

export { default as Room } from "./Room";
export type { IRoom } from "./Room";
export { RoomSchemaZod } from "./Room";

export { default as Reservation } from "./Reservation";
export type { IReservation } from "./Reservation";
export { ReservationSchemaZod } from "./Reservation";

export { default as UserCalendarLink } from "./UserCalendarLink";
export type { IUserCalendarLink } from "./UserCalendarLink";
export { UserCalendarLinkSchemaZod } from "./UserCalendarLink";
