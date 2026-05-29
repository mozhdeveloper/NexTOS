import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  int,
  decimal,
  boolean,
  date,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin", "sales", "tech", "client"]).default("user").notNull(),
  clientId: int("clientId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export const equipment = mysqlTable("equipment", {
  id: serial("id").primaryKey(),
  clientId: int("clientId").notNull(),
  unitId: varchar("unitId", { length: 50 }).notNull(),
  equipmentType: mysqlEnum("equipmentType", ["Heavy Equipment", "Lab Equipment", "Testing Equipment", "Monitoring Device", "Other"]).notNull(),
  serialNumber: varchar("serialNumber", { length: 100 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 100 }).notNull(),
  model: varchar("model", { length: 100 }).notNull(),
  installDate: timestamp("installDate"),
  warrantyExpiry: timestamp("warrantyExpiry"),
  status: mysqlEnum("status", ["active", "inactive", "maintenance", "retired", "under_service", "broken", "service_due"]).default("active").notNull(),
  
  // Heavy Equipment Logic (Hours-based)
  currentHours: int("currentHours").default(0),
  lastPMSHours: int("lastPMSHours").default(0),
  pmsInterval: int("pmsInterval").default(0),
  nextPMSHours: int("nextPMSHours").default(0),
  
  // Calibration Logic (Date-based)
  lastCalibrationDate: timestamp("lastCalibrationDate"),
  calibrationFrequency: int("calibrationFrequency").default(0), // in months
  nextCalibrationDate: timestamp("nextCalibrationDate"),
  
  location: varchar("location", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const serviceRecords = mysqlTable("service_records", {
  id: serial("id").primaryKey(),
  equipmentId: int("equipmentId").notNull(),
  clientId: int("clientId").notNull(),
  technician: varchar("technician", { length: 255 }).notNull(),
  serviceCategory: mysqlEnum("serviceCategory", ["Heavy Equipment PMS", "Calibration PMS", "Lab Testing Service", "Repair", "Inspection", "Installation"]).notNull(),
  description: text("description").notNull(),
  findings: text("findings"),
  workDone: text("workDone"),
  recommendation: text("recommendation"),
  
  // Logic-specific fields
  hoursAtService: int("hoursAtService"),
  lastCalibrationDate: timestamp("lastCalibrationDate"),
  nextCalibrationDate: timestamp("nextCalibrationDate"),
  
  // Lab Testing specific
  testType: varchar("testType", { length: 100 }),
  sampleName: varchar("sampleName", { length: 100 }),
  projectName: varchar("projectName", { length: 255 }),
  labStatus: mysqlEnum("labStatus", ["Requested", "Scheduled", "In Progress", "Completed", "Released"]),
  reportAttachment: varchar("reportAttachment", { length: 255 }),
  
  partsUsed: text("partsUsed"),
  partsUsedDetails: text("partsUsedDetails"),
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
  scheduledDate: timestamp("scheduledDate").notNull(),
  completedDate: timestamp("completedDate"),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull(),
  invoiceId: int("invoiceId"),
  clientSignature: text("clientSignature"),
  techSignature: text("techSignature"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const bookings = mysqlTable("bookings", {
  id: serial("id").primaryKey(),
  clientId: int("clientId").notNull(),
  equipmentId: int("equipmentId").notNull(),
  serviceCategory: mysqlEnum("serviceCategory", ["Heavy Equipment PMS", "Calibration PMS", "Lab Testing Service", "Repair", "Inspection", "Installation"]).notNull(),
  requestedDate: timestamp("requestedDate").notNull(),
  preferredTime: varchar("preferredTime", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "completed", "cancelled"]).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const packages = mysqlTable("packages", {
  id: serial("id").primaryKey(),
  clientId: int("clientId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  packageType: mysqlEnum("packageType", ["Heavy Equipment PMS Package", "Calibration Package", "Lab Testing Package"]).notNull(),
  tier: mysqlEnum("tier", ["basic", "professional", "enterprise"]).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  billingCycle: mysqlEnum("billingCycle", ["monthly", "quarterly", "annual"]).notNull(),
  includedServices: text("includedServices"), // Stored as comma-separated or JSON string
  totalVisits: int("totalVisits").notNull(),
  visitsRemaining: int("visitsRemaining").notNull(),
  usageCount: int("usageCount").default(0),
  durationMonths: int("durationMonths").notNull(),
  validityMonths: int("validityMonths").notNull(),
  terms: text("terms"),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  linkedEquipmentId: int("linkedEquipmentId"),
  linkedServiceCategory: varchar("linkedServiceCategory", { length: 100 }),
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const invoices = mysqlTable("invoices", {
  id: serial("id").primaryKey(),
  clientId: int("clientId").notNull(),
  packageId: int("packageId"),
  serviceRecordId: int("serviceRecordId"),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["draft", "sent", "paid", "overdue", "cancelled"]).default("draft").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  paidDate: timestamp("paidDate"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type Equipment = typeof equipment.$inferSelect;
export type ServiceRecord = typeof serviceRecords.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Package = typeof packages.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
