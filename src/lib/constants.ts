export const ORDER_STATUSES = [
  "PENDING_PAYMENT",
  "PAYMENT_UNDER_REVIEW",
  "PAID",
  "PROCESSING",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAYMENT_UNDER_REVIEW: "Payment Under Review",
  PAID: "Paid",
  PROCESSING: "Processing",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

/** Statuses an admin may move an order to from a given status. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAYMENT_UNDER_REVIEW", "PROCESSING", "CANCELLED"],
  PAYMENT_UNDER_REVIEW: ["PAID", "PENDING_PAYMENT", "CANCELLED"],
  PAID: ["PROCESSING", "CANCELLED", "REFUNDED"],
  PROCESSING: ["PACKED", "CANCELLED", "REFUNDED"],
  PACKED: ["SHIPPED", "PROCESSING", "CANCELLED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["COMPLETED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

/** Orders in these statuses count towards sales. */
export const SALE_STATUSES: OrderStatus[] = ["PAID", "PROCESSING", "PACKED", "SHIPPED", "DELIVERED", "COMPLETED", "REFUNDED"];

/** A review is "verified purchase" only when it is tied to an order in one of these statuses. */
export const REVIEW_ELIGIBLE_STATUSES: OrderStatus[] = ["DELIVERED", "COMPLETED"];

export const PAYMENT_METHODS = {
  GCASH: "GCash",
  MAYA: "Maya",
  CARD: "Debit / Credit Card",
  BANK_TRANSFER: "Bank Transfer",
  COD: "Cash on Delivery",
} as const;
export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const EVENT_STATUSES = [
  "INQUIRY_RECEIVED",
  "REVIEWING",
  "QUOTATION_SENT",
  "CLIENT_ACCEPTED",
  "DEPOSIT_PENDING",
  "CONFIRMED",
  "EVENT_COMPLETED",
  "DECLINED",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  INQUIRY_RECEIVED: "Inquiry Received",
  REVIEWING: "Reviewing",
  QUOTATION_SENT: "Quotation Sent",
  CLIENT_ACCEPTED: "Client Accepted",
  DEPOSIT_PENDING: "Deposit Pending",
  CONFIRMED: "Confirmed",
  EVENT_COMPLETED: "Event Completed",
  DECLINED: "Declined / Closed",
};
export const EVENT_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  INQUIRY_RECEIVED: ["REVIEWING", "DECLINED"],
  REVIEWING: ["QUOTATION_SENT", "DECLINED"],
  QUOTATION_SENT: ["CLIENT_ACCEPTED", "REVIEWING", "DECLINED"],
  CLIENT_ACCEPTED: ["DEPOSIT_PENDING", "DECLINED"],
  DEPOSIT_PENDING: ["CONFIRMED", "DECLINED"],
  CONFIRMED: ["EVENT_COMPLETED", "DECLINED"],
  EVENT_COMPLETED: [],
  DECLINED: [],
};

export const EVENT_TYPES = [
  "Wedding",
  "Corporate Event",
  "Product Launch",
  "Private Celebration",
  "Brand Activation",
  "Special Occasion",
  "Other",
];

/** Business inquiries share the inquiry pipeline with events. */
export const BUSINESS_INQUIRY_TYPES = [
  "Private / White Label",
  "Business Scent Subscription",
  "Hotel & Hospitality",
  "Café & Restaurant",
  "Corporate Gifting",
];

export const INQUIRY_TYPES = [...EVENT_TYPES.filter((t) => t !== "Other"), ...BUSINESS_INQUIRY_TYPES, "Other"];

export const PRESS_KINDS = {
  TV: "TV Appearance",
  INTERVIEW: "Media Interview",
  EVENT: "Brand Event",
  COLLABORATION: "Collaboration",
  PORTFOLIO: "Event Scenting Portfolio",
} as const;

export const PH_REGIONS = [
  "NCR — National Capital Region",
  "CAR — Cordillera Administrative Region",
  "Region I — Ilocos Region",
  "Region II — Cagayan Valley",
  "Region III — Central Luzon",
  "Region IV-A — CALABARZON",
  "MIMAROPA Region",
  "Region V — Bicol Region",
  "Region VI — Western Visayas",
  "NIR — Negros Island Region",
  "Region VII — Central Visayas",
  "Region VIII — Eastern Visayas",
  "Region IX — Zamboanga Peninsula",
  "Region X — Northern Mindanao",
  "Region XI — Davao Region",
  "Region XII — SOCCSKSARGEN",
  "Region XIII — Caraga",
  "BARMM — Bangsamoro Autonomous Region in Muslim Mindanao",
];

/** Minimum approved reviews before an aggregate rating is shown publicly. */
export const MIN_REVIEWS_FOR_AGGREGATE = 3;
