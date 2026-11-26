/** Static reference data used to build realistic mock records. */
export const CATEGORY_FIXTURES = [
  { code: "OFF", name: "Office Supplies", description: "Pens, paper, folders and everyday desk supplies." },
  { code: "PAP", name: "Paper Products", description: "Bond paper, specialty paper and printed forms." },
  { code: "ITE", name: "ICT Equipment", description: "Computers, peripherals, cables and storage media." },
  { code: "CLN", name: "Janitorial Supplies", description: "Cleaning chemicals, tools and sanitation supplies." },
  { code: "PPE", name: "Safety & PPE", description: "Personal protective equipment and safety gear." },
  { code: "PNT", name: "ICT Supplies", description: "Toner, ink cartridges, drums and other ICT consumables." },
  { code: "PAN", name: "Pantry Supplies", description: "Coffee, water, cups and kitchen consumables." },
  { code: "MED", name: "Medical Supplies", description: "First aid kits, medicines and medical consumables." },
];

/** [categoryCode, name, unit, unitCost, reorderLevel, reorderQty] */
export const PRODUCT_FIXTURES: [string, string, string, number, number, number][] = [
  ["OFF", "Ballpoint Pen, Blue (box of 50)", "box", 285, 15, 40],
  ["OFF", "Ballpoint Pen, Black (box of 50)", "box", 285, 15, 40],
  ["OFF", "Permanent Marker, Black", "pcs", 38, 40, 100],
  ["OFF", "Whiteboard Marker Set (4 colors)", "set", 165, 20, 50],
  ["OFF", "Stapler, Heavy Duty", "pcs", 420, 8, 20],
  ["OFF", "Staple Wire No. 35 (box)", "box", 42, 40, 100],
  ["OFF", "Expanding Envelope, Long", "pcs", 28, 60, 150],
  ["OFF", "Sign Pen, Assorted", "pack", 95, 20, 50],
  ["OFF", "Correction Tape", "pcs", 45, 30, 80],
  ["OFF", "Paper Clips, Jumbo (box)", "box", 32, 30, 80],
  ["PAP", "Bond Paper A4, 70gsm", "ream", 235, 80, 200],
  ["PAP", "Bond Paper Long, 70gsm", "ream", 255, 60, 150],
  ["PAP", "Sticky Notes 3x3", "pack", 58, 40, 100],
  ["PAP", "Record Book, 300 pages", "pcs", 125, 15, 40],
  ["PAP", "Continuous Form, 3-ply", "box", 1850, 4, 10],
  ["ITE", "USB Flash Drive 64GB", "pcs", 395, 15, 40],
  ["ITE", "Wireless Mouse", "pcs", 650, 10, 25],
  ["ITE", "USB Keyboard", "pcs", 720, 8, 20],
  ["ITE", "HDMI Cable, 3m", "pcs", 280, 10, 30],
  ["ITE", "Extension Cord, 6 gang", "pcs", 890, 6, 15],
  ["ITE", "LAN Cable Cat6 (305m box)", "box", 6200, 2, 4],
  ["CLN", "Liquid Hand Soap, 1 gallon", "gallon", 360, 12, 30],
  ["CLN", "Disinfectant Spray, 510g", "bottle", 395, 15, 40],
  ["CLN", "Tissue Paper, 2-ply (pack of 12)", "pack", 310, 25, 60],
  ["CLN", "Garbage Bag, XL (pack of 10)", "pack", 85, 40, 100],
  ["CLN", "Floor Mop with Handle", "pcs", 340, 6, 15],
  ["CLN", "Bleach, 1 gallon", "gallon", 210, 10, 25],
  ["PPE", "Face Mask, 3-ply (box of 50)", "box", 180, 20, 50],
  ["PPE", "Nitrile Gloves, Medium (box)", "box", 420, 10, 30],
  ["PPE", "Safety Helmet", "pcs", 560, 5, 12],
  ["PPE", "Reflective Safety Vest", "pcs", 245, 10, 25],
  ["PNT", "Toner Cartridge HP 107A", "pcs", 2850, 6, 15],
  ["PNT", "Ink Bottle Epson 003, Black", "bottle", 360, 12, 30],
  ["PNT", "Ink Bottle Epson 003, Color Set", "set", 1020, 6, 15],
  ["PNT", "Drum Unit Brother DR-2455", "pcs", 3950, 2, 5],
  ["PAN", "3-in-1 Coffee (pack of 30)", "pack", 265, 20, 50],
  ["PAN", "Purified Water, 5 gallon", "gallon", 45, 30, 80],
  ["PAN", "Paper Cups, 8oz (pack of 50)", "pack", 95, 25, 60],
  ["MED", "First Aid Kit, Complete", "set", 1450, 4, 10],
  ["MED", "Isopropyl Alcohol 70%, 1L", "bottle", 165, 20, 50],
];

export const SUPPLIER_FIXTURES = [
  { name: "Metro Office Depot Inc.", contact: "Carla Santos", city: "Makati City", terms: "Net 30", lead: 3 },
  { name: "Pacific Paper Trading", contact: "Jun Reyes", city: "Valenzuela City", terms: "Net 30", lead: 5 },
  { name: "TechLink Computer Supplies", contact: "Mark Villanueva", city: "Quezon City", terms: "Net 15", lead: 4 },
  { name: "CleanPro Janitorial Supply", contact: "Grace Bautista", city: "Pasig City", terms: "Net 30", lead: 3 },
  { name: "SafeGuard Industrial Corp.", contact: "Ramon Cruz", city: "Caloocan City", terms: "Net 45", lead: 7 },
  { name: "PrintMasters Consumables", contact: "Liza Mendoza", city: "Mandaluyong City", terms: "Net 30", lead: 5 },
  { name: "Sunrise Pantry Distributors", contact: "Paolo Garcia", city: "Taguig City", terms: "COD", lead: 2 },
  { name: "MediCare Supplies PH", contact: "Andrea Lim", city: "Manila", terms: "Net 15", lead: 4 },
  { name: "Northpoint General Merchandise", contact: "Kenneth Tan", city: "Marikina City", terms: "Net 60", lead: 10 },
];

/** Preferred supplier index per category code. */
export const CATEGORY_SUPPLIER: Record<string, number> = { OFF: 0, PAP: 1, ITE: 2, CLN: 3, PPE: 4, PNT: 5, PAN: 6, MED: 7 };

export const WAREHOUSE_FIXTURES = [
  { code: "WH-MAIN", name: "Main Warehouse", type: "central", address: "MPC Main Campus, Sta. Elena, Marikina City", manager: "Roberto Aquino", barangay: "Sta. Elena", postalCode: "1800" },
  { code: "WH-SUP", name: "Supplies Warehouse", type: "supplies", address: "Bldg. B, Supply Depot, Marikina City", manager: "Melanie Ramos", barangay: "Sta. Elena", postalCode: "1800" },
  { code: "WH-PROP", name: "Property Warehouse", type: "property", address: "Bldg. C, Property Storage, Marikina City", manager: "Dennis Flores", barangay: "Concepcion Uno", postalCode: "1807" },
  { code: "WH-FIELD", name: "Field / Satellite Warehouse", type: "field", address: "MPC Annex, Industrial Area, Marikina City", manager: "Joy Navarro", barangay: "Fortune", postalCode: "1810" },
] as const;

export const PEOPLE = ["Andrea Villanueva", "Roberto Aquino", "Liza Mercado", "Mark Soriano", "Joy Navarro", "Paolo Ramos", "Grace Tan"];
