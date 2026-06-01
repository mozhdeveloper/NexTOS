import seedData from "./seed-data.json";

export type SeedData = typeof seedData;

export type SeedClient = SeedData["clients"][number];
export type SeedEquipment = SeedData["equipment"][number];
export type SeedServiceRecord = SeedData["serviceRecords"][number];
export type SeedBooking = SeedData["bookings"][number];
export type SeedPackage = SeedData["packages"][number];
export type SeedInvoice = SeedData["invoices"][number];
export type SeedPart = SeedData["parts"][number];
export type SeedCrmLead = SeedData["crmLeads"][number];

export const seedRepo = {
  getAll() {
    return seedData;
  },

  getClients() {
    return seedData.clients;
  },

  getClientById(clientId: string) {
    return seedData.clients.find((client) => client.id === clientId) ?? null;
  },

  getEquipment() {
    return seedData.equipment;
  },

  getEquipmentById(equipmentId: string) {
    return seedData.equipment.find((equipment) => equipment.id === equipmentId) ?? null;
  },

  getEquipmentByClientId(clientId: string) {
    return seedData.equipment.filter((equipment) => equipment.clientId === clientId);
  },

  getServiceRecords() {
    return seedData.serviceRecords;
  },

  getServiceRecordsByClientId(clientId: string) {
    return seedData.serviceRecords.filter((record) => record.clientId === clientId);
  },

  getServiceRecordsByEquipmentId(equipmentId: string) {
    return seedData.serviceRecords.filter(
      (record) =>
        record.equipmentId === equipmentId ||
        record.seedEquipmentId === equipmentId
    );
  },

  getBookings() {
    return seedData.bookings;
  },

  getBookingsByClientId(clientId: string) {
    return seedData.bookings.filter((booking) => booking.clientId === clientId);
  },

  getPackages() {
    return seedData.packages;
  },

  getInvoices() {
    return seedData.invoices;
  },

  getInvoicesByClientId(clientId: string) {
    return seedData.invoices.filter((invoice) => invoice.clientId === clientId);
  },

  getParts() {
    return seedData.parts;
  },

  getCrmLeads() {
    return seedData.crmLeads;
  },

  getFollowUpTasks() {
    return seedData.followUpTasks;
  },

  getEmailMarketing() {
    return seedData.emailMarketing;
  },

  getDashboardAlerts() {
    return seedData.dashboardAlerts;
  },

  getSalesPerformance() {
    return seedData.salesPerformance;
  },

  getServiceTypes() {
    return seedData.serviceTypes;
  },

  getPmsStatuses() {
    return seedData.pmsStatuses;
  },

  getEquipmentTypes() {
    return seedData.equipmentTypes;
  },

  getServiceIntervalUnits() {
    return seedData.serviceIntervalUnits;
  },
};