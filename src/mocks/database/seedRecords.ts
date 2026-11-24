import { DOCUMENTS } from "@/config/documents";
import type { Product, Supplier, Warehouse } from "@/types/models";
import type { ApprovalStep, DocumentItem, DocumentStatus, MasterRecord, TransactionDocument } from "@/types/records";
import type { createRandom } from "./random";

interface SeedContext {
  warehouses: Warehouse[];
  products: Product[];
  suppliers: Supplier[];
  random: ReturnType<typeof createRandom>;
  daysAgo: (days: number, hour?: number) => Date;
  isoDate: (date: Date) => string;
}

const APPROVERS: Record<string, string> = {
  "Warehouse Head": "Roberto Aquino",
  "Supply Officer": "Liza Mercado",
  "Property Custodian": "Joy Navarro",
  "Inspection Officer": "Paolo Ramos",
  "Approving Officer": "Andrea Villanueva",
  "Inventory Committee": "Mark Soriano",
  Accounting: "Grace Tan",
  "Inspection Committee": "Paolo Ramos",
  "Head of Agency": "Andrea Villanueva",
};

/** Approval trail for a document: `approved` steps done, then a pending step (unless finished). */
export function buildApprovals(steps: string[], approved: number, at: string, rejected = false): ApprovalStep[] {
  return steps.map((role, index) => {
    if (index < approved) return { role, status: "approved", by: APPROVERS[role] ?? "Approver", at, remarks: null };
    if (index === approved && rejected) return { role, status: "rejected", by: APPROVERS[role] ?? "Approver", at, remarks: "Quantities do not match supporting documents." };
    if (index === approved) return { role, status: "pending" };
    return { role, status: "waiting" };
  });
}

export function seedMastersAndDocuments({ warehouses, products, suppliers, random, daysAgo, isoDate }: SeedContext) {
  const created = daysAgo(120).toISOString();
  const stamp = { createdAt: created, updatedAt: created };
  const record = (id: string, fields: Record<string, string | number | null>): MasterRecord => ({ id, ...fields, ...stamp });

  const locations: MasterRecord[] = [];
  warehouses.forEach((warehouse, warehouseIndex) => {
    const count = warehouseIndex === 0 ? 6 : 4;
    for (let index = 0; index < count; index += 1) {
      const type = index === 0 ? "Area" : index % 3 === 0 ? "Shelf" : index % 2 === 0 ? "Bin" : "Rack";
      const rack = `${String.fromCharCode(65 + (index % 3))}-0${1 + Math.floor(index / 3)}`;
      locations.push(
        record(`loc-${locations.length + 1}`, {
          code: `LOC-${String(locations.length + 1).padStart(3, "0")}`,
          name: index === 0 ? "Receiving Area" : `${type} ${rack}`,
          warehouseId: warehouse.id,
          type,
          zone: index === 0 ? "RCV" : String.fromCharCode(65 + (index % 2)),
          rack: index === 0 ? "" : rack,
          bin: type === "Bin" ? `B${index}` : "",
          capacity: index === 0 ? 0 : [500, 1000, 1500][index % 3],
          description: `${type} storage at ${warehouse.name}`,
          status: index === 5 ? "inactive" : "active",
        }),
      );
    }
  });

  const itemClassifications = [
    ["CON", "Office Supplies Inventory", "10404010", "Consumable"],
    ["SEP", "Semi-Expendable Machinery and Equipment", "10405020", "Semi-Expendable"],
    ["SEF", "Semi-Expendable Furniture and Fixtures", "10406010", "Semi-Expendable"],
    ["OSI", "Other Supplies and Materials Inventory", "10404990", "Consumable"],
    ["PPE", "Property, Plant and Equipment", "10605000", "PPE"],
  ].map(([code, name, accountCode, nature], index) =>
    record(`icl-${index + 1}`, { code, name, accountCode, nature, description: `${name} (${nature})`, status: "active" }),
  );

  const units = [
    ["pcs", "Piece", "pcs", 1], ["box", "Box", "pcs", 50], ["pack", "Pack", "pcs", 12], ["ream", "Ream", "sheet", 500],
    ["set", "Set", "pcs", 1], ["bottle", "Bottle", "ml", 500], ["gallon", "Gallon", "liter", 3.785], ["roll", "Roll", "pcs", 1],
    ["kg", "Kilogram", "g", 1000], ["liter", "Liter", "ml", 1000],
  ].map(([code, name, baseUnit, conversion], index) => record(`uom-${index + 1}`, { code, name, baseUnit, conversion, status: "active" }));

  const propertyClassifications = [
    ["10605030", "Information and Communication Technology Equipment", 5, 10],
    ["10605020", "Office Equipment", 5, 10],
    ["10607010", "Furniture and Fixtures", 10, 10],
    ["10606010", "Motor Vehicles", 7, 10],
    ["10605090", "Other Machinery and Equipment", 10, 10],
  ].map(([code, name, usefulLife, residualRate], index) =>
    record(`pcl-${index + 1}`, { code, name, usefulLife, residualRate, status: "active" }),
  );

  const employees = [
    ["2018-0145", "Maria Santos", "Administrative Officer IV", "Administration"],
    ["2016-0098", "Jose Reyes", "Accountant III", "Finance"],
    ["2019-0211", "Carlo Bautista", "Information Technology Officer II", "IT"],
    ["2015-0034", "Angela Cruz", "HR Management Officer III", "Human Resources"],
    ["2020-0302", "Rafael Ocampo", "Engineer II", "Facilities"],
    ["2017-0120", "Kristine Garcia", "Planning Officer II", "Operations"],
    ["2021-0355", "Daniel Mendoza", "Driver II", "Logistics"],
    ["2014-0012", "Patricia Torres", "Supply Officer III", "Logistics"],
  ].map(([employeeNo, name, position, office], index) =>
    record(`emp-${index + 1}`, {
      employeeNo,
      name,
      position,
      office,
      email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase()}@agency.gov.ph`,
      status: "active",
    }),
  );

  const propertyTemplates: [string, number, number][] = [
    ["Desktop Computer, Core i7, 16GB RAM", 0, 58500],
    ["Laptop Computer, Core i5, 8GB RAM", 0, 52000],
    ["Multifunction Printer, A3", 1, 38900],
    ["Air Conditioner, Split Type 2.0HP", 1, 45500],
    ["Executive Table, Wooden", 2, 18500],
    ["Steel Filing Cabinet, 4-Drawer", 2, 12800],
    ["Network Switch, 24-Port Managed", 0, 32000],
    ["Projector, 4000 Lumens", 1, 41000],
    ["Service Vehicle, Pick-up 4x2", 3, 1385000],
    ["Generator Set, 10kVA", 4, 265000],
  ];
  const properties: MasterRecord[] = [];
  for (let index = 0; index < 24; index += 1) {
    const [description, classIndex, cost] = propertyTemplates[index % propertyTemplates.length];
    const acquired = daysAgo(random.int(200, 1900));
    const status = index === 21 ? "for-disposal" : index === 22 ? "disposed" : index === 23 ? "lost" : index % 5 === 4 ? "available" : "assigned";
    properties.push(
      record(`prop-${index + 1}`, {
        propertyNo: `${cost >= 50000 ? "PPE" : "SE"}-${acquired.getFullYear()}-${String(index + 1).padStart(4, "0")}`,
        description,
        classificationId: propertyClassifications[classIndex].id,
        serialNo: `SN${random.int(100000, 999999)}`,
        acquisitionDate: isoDate(acquired),
        acquisitionCost: cost,
        accountableId: status === "assigned" ? employees[index % employees.length].id : null,
        locationId: locations[index % locations.length].id,
        condition: status === "for-disposal" || status === "disposed" ? "Unserviceable" : index % 9 === 8 ? "For Repair" : "Serviceable",
        status,
      }),
    );
  }

  // Documents -----------------------------------------------------------------------
  const documents: TransactionDocument[] = [];
  const statuses: { status: DocumentStatus; approved: number; rejected?: boolean }[] = [
    { status: "posted", approved: 99 },
    { status: "posted", approved: 99 },
    { status: "pending", approved: 0 },
    { status: "pending", approved: 1 },
    { status: "pending", approved: 2 },
    { status: "draft", approved: 0 },
    { status: "rejected", approved: 1, rejected: true },
  ];
  const active = products.filter((product) => product.status === "active");
  const people = ["Juan Dela Cruz", "Maria Santos", "Mark Soriano", "Liza Mercado", "Joy Navarro"];

  DOCUMENTS.forEach((def) => {
    const count = def.module === "property" ? 4 : statuses.length;
    for (let index = 0; index < count; index += 1) {
      const plan = statuses[index % statuses.length];
      const date = daysAgo(2 + index * 3 + random.int(0, 2), 10);
      const at = new Date(date.getTime() + 5 * 3600000).toISOString();
      const approvedSteps = Math.min(plan.approved, def.approvals.length);
      const warehouse = warehouses[index % 2];
      const other = warehouses[(index % 2) + 2];
      const employee = employees[index % employees.length];
      const fields: Record<string, string | number | null> = {};
      def.fields.forEach((field) => {
        if (field.optionsFrom === "warehouses") fields[field.name] = field.name.startsWith("to") ? other.id : warehouse.id;
        else if (field.optionsFrom === "suppliers") fields[field.name] = suppliers[index % 8].id;
        else if (field.optionsFrom === "employees") fields[field.name] = field.name.startsWith("to") ? employees[(index + 3) % employees.length].id : employee.id;
        else if (field.options) fields[field.name] = field.options[index % field.options.length];
        else if (field.type === "date") fields[field.name] = isoDate(new Date(date.getTime() + 3 * 86400000));
        else if (field.type === "currency") fields[field.name] = 1500 * (index + 1);
        else if (field.name === "poNumber") fields[field.name] = `PO-2026-${String(101 + index).padStart(4, "0")}`;
        else if (field.name === "period") fields[field.name] = "October 2026";
        else if (field.name === "office" || field.name === "department") fields[field.name] = employee.office as string;
        else if (field.type === "text") fields[field.name] = field.name.toLowerCase().includes("no") ? `REF-${random.int(10000, 99999)}` : people[index % people.length];
      });

      let items: DocumentItem[];
      if (def.itemMode === "property") {
        const pool = properties.filter((property) => (def.key === "property-disposals" ? property.condition === "Unserviceable" || property.status === "lost" : true));
        items = [pool[index % pool.length], pool[(index + 1) % pool.length]]
          .filter((value, position, list) => list.indexOf(value) === position)
          .map((property) => ({ refId: property.id, quantity: 1, unitCost: property.acquisitionCost as number, condition: property.condition as string }));
      } else {
        items = [0, 1, 2].map((offset) => {
          const product = active[(index * 3 + offset + def.key.length) % active.length];
          if (def.itemMode === "count") {
            const systemQty = random.int(10, 120);
            const variance = offset === 1 ? 0 : random.int(-4, 3);
            return { refId: product.id, quantity: variance, systemQty, countedQty: systemQty + variance, unitCost: product.unitCost };
          }
          return { refId: product.id, quantity: random.int(2, 30), unitCost: product.unitCost };
        });
      }

      documents.push({
        id: `${def.prefix.toLowerCase()}-${index + 1}`,
        type: def.key,
        number: `${def.prefix}-2026-${String(index + 101).padStart(4, "0")}`,
        date: isoDate(date),
        status: plan.status,
        fields,
        items,
        approvals: plan.status === "draft" ? buildApprovals(def.approvals, 0, at).map((step) => ({ ...step, status: "waiting" as const })) : buildApprovals(def.approvals, approvedSteps, at, plan.rejected),
        remarks: plan.rejected ? "Returned for correction." : `${def.singular[0].toUpperCase()}${def.singular.slice(1)} for ${String(fields.office ?? warehouse.name)}`,
        createdBy: people[index % people.length],
        createdAt: date.toISOString(),
        updatedAt: at,
      });
    }
  });

  return {
    masters: {
      locations,
      "item-classifications": itemClassifications,
      units,
      "property-classifications": propertyClassifications,
      employees,
      properties,
    },
    documents,
  };
}
