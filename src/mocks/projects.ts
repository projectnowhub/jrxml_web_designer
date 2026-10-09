// Dummy projects until the backend API is ready: their details (name, logo,
// introduction…) and their table sources. Values are ready to print, as the
// API is expected to send them.

import type { ProjectDetails, ProjectField } from "@/types/dataSource";
import { buildProjectSources, type MockDataSource } from "./dataSources";
import klMetroLogo from "./logos/kl-metro.png";
import penangCoastalLogo from "./logos/penang-coastal.png";
import johorSolarLogo from "./logos/johor-solar.png";
import sabahHospitalLogo from "./logos/sabah-hospital.png";

export interface MockProject extends ProjectDetails {
  sources: MockDataSource[];
}

// Every project has these details
const PROJECT_FIELDS: ProjectField[] = [
  { key: "name", label: "Project Name", type: "text" },
  { key: "code", label: "Project Code", type: "text" },
  { key: "logo", label: "Project Logo", type: "image" },
  { key: "description", label: "Description", type: "text" },
  { key: "introduction", label: "Introduction", type: "longText" },
  { key: "client", label: "Client", type: "text" },
  { key: "location", label: "Location", type: "text" },
  { key: "manager", label: "Project Manager", type: "text" },
  { key: "start_date", label: "Start Date", type: "text" },
  { key: "end_date", label: "End Date", type: "text" },
  { key: "budget", label: "Budget", type: "text" },
  { key: "status", label: "Status", type: "text" },
  // Details that suit barcodes (drag them onto a Barcode element): a web
  // link or contact for a QR code, numbers and tags for 1D codes
  { key: "website", label: "Website", type: "text" },
  { key: "contact_email", label: "Contact Email", type: "text" },
  { key: "contact_phone", label: "Contact Phone", type: "text" },
  { key: "project_number", label: "Project Number", type: "text" },
  { key: "asset_tag", label: "Asset Tag", type: "text" },
  { key: "item_number", label: "Item Number (EAN-13)", type: "text" },
  { key: "postcode", label: "Site Postcode", type: "text" },
];

// Logos are bundled files; the report server needs a full address
const absoluteUrl = (url: string) =>
  typeof window === "undefined" ? url : new URL(url, window.location.href).href;

export const MOCK_PROJECTS: MockProject[] = [
  {
    id: "kl-metro",
    name: "KL Metro Line 3",
    code: "KL-MRT3",
    fields: PROJECT_FIELDS,
    values: {
      name: "KL Metro Line 3",
      code: "KL-MRT3",
      logo: absoluteUrl(klMetroLogo),
      description: "A 51 km orbital rail line linking 31 stations around Kuala Lumpur.",
      introduction:
        "The KL Metro Line 3 project builds a 51 km orbital rail line around Kuala Lumpur, " +
        "connecting 31 stations with the existing LRT and MRT network. This report covers " +
        "procurement, materials, vendors and milestones for the civil and systems packages.",
      client: "Klang Valley Transit Authority",
      location: "Kuala Lumpur, Malaysia",
      manager: "Aisyah Rahman",
      start_date: "15 Jan 2025",
      end_date: "30 Jun 2028",
      budget: "RM 4,850,000,000",
      status: "In progress",
      website: "https://www.klmetro3.example.com",
      contact_email: "projects@klmetro3.example.com",
      contact_phone: "+60 3 2711 8888",
      project_number: "2025003101",
      asset_tag: "KLM3-AT-000451",
      item_number: "9551234000010",
      postcode: "50450",
    },
    sources: buildProjectSources({
      prefix: "KLM",
      priceFactor: 1,
      dayShift: 0,
      rowCount: 20,
      milestones: [
        ["Site survey complete", "Design", "Aisyah Rahman", "Done", 100, "2025-03-31"],
        ["Detailed design approved", "Design", "Lim Wei Jie", "Done", 100, "2025-08-15"],
        ["Tunnel boring starts", "Civil works", "Ravi Kumar", "Done", 100, "2025-11-01"],
        ["Station shells complete", "Civil works", "Ravi Kumar", "In progress", 62, "2026-12-31"],
        ["Track laying", "Systems", "Nurul Huda", "In progress", 35, "2027-06-30"],
        ["Signalling installed", "Systems", "Daniel Tan", "Not started", 0, "2027-12-15"],
        ["Trial runs", "Commissioning", "Aisyah Rahman", "Not started", 0, "2028-04-30"],
      ],
    }),
  },
  {
    id: "penang-coastal",
    name: "Penang Coastal Highway",
    code: "PG-CH2",
    fields: PROJECT_FIELDS,
    values: {
      name: "Penang Coastal Highway",
      code: "PG-CH2",
      logo: absoluteUrl(penangCoastalLogo),
      description: "A 19 km coastal expressway with two interchanges and a sea viaduct.",
      introduction:
        "The Penang Coastal Highway connects George Town with Batu Maung along the east " +
        "coast. Phase 2 adds a 4 km sea viaduct, two interchanges and coastal protection " +
        "works. Figures in this report are for Phase 2 only.",
      client: "Penang State Public Works",
      location: "Penang, Malaysia",
      manager: "Lee Mei Ling",
      start_date: "1 Apr 2025",
      end_date: "31 Dec 2027",
      budget: "RM 1,320,000,000",
      status: "In progress",
      website: "https://www.penangcoastal.example.com",
      contact_email: "info@penangcoastal.example.com",
      contact_phone: "+60 4 262 1955",
      project_number: "2025004207",
      asset_tag: "PGCH2-AT-000318",
      item_number: "9551234000027",
      postcode: "11960",
    },
    sources: buildProjectSources({
      prefix: "PCH",
      priceFactor: 0.85,
      dayShift: 21,
      rowCount: 16,
      milestones: [
        ["Environmental approval", "Planning", "Lee Mei Ling", "Done", 100, "2025-05-30"],
        ["Piling for sea viaduct", "Civil works", "Hafiz Osman", "In progress", 70, "2026-09-30"],
        ["Interchange A complete", "Civil works", "Hafiz Osman", "In progress", 45, "2026-12-15"],
        ["Coastal protection", "Marine works", "Siti Aminah", "In progress", 30, "2027-03-31"],
        ["Road surfacing", "Finishing", "Lee Mei Ling", "Not started", 0, "2027-09-30"],
      ],
    }),
  },
  {
    id: "johor-solar",
    name: "Johor Solar Farm",
    code: "JH-SF1",
    fields: PROJECT_FIELDS,
    values: {
      name: "Johor Solar Farm",
      code: "JH-SF1",
      logo: absoluteUrl(johorSolarLogo),
      description: "A 120 MW solar farm with battery storage near Kluang.",
      introduction:
        "Johor Solar Farm is a 120 MW photovoltaic plant with 40 MWh of battery storage, " +
        "built on 180 hectares near Kluang. Power is sold to the national grid under a " +
        "21-year agreement.",
      client: "Southern Green Energy Sdn Bhd",
      location: "Kluang, Johor, Malaysia",
      manager: "Farid Ismail",
      start_date: "10 Jun 2025",
      end_date: "28 Feb 2027",
      budget: "RM 610,000,000",
      status: "On hold",
      website: "https://www.johorsolar.example.com",
      contact_email: "contact@johorsolar.example.com",
      contact_phone: "+60 7 771 3300",
      project_number: "2025006410",
      asset_tag: "JHSF1-AT-000127",
      item_number: "9551234000034",
      postcode: "86000",
    },
    sources: buildProjectSources({
      prefix: "JSF",
      priceFactor: 1.2,
      dayShift: 45,
      rowCount: 12,
      milestones: [
        ["Land acquisition", "Planning", "Farid Ismail", "Done", 100, "2025-07-31"],
        ["Grid connection permit", "Planning", "Grace Wong", "Done", 100, "2025-10-15"],
        ["Panel mounting", "Construction", "Arun Pillai", "On hold", 20, "2026-11-30"],
        ["Battery storage", "Construction", "Arun Pillai", "Not started", 0, "2027-01-31"],
      ],
    }),
  },
  {
    id: "sabah-hospital",
    name: "Sabah General Hospital Extension",
    code: "SB-GH4",
    fields: PROJECT_FIELDS,
    values: {
      name: "Sabah General Hospital Extension",
      code: "SB-GH4",
      logo: absoluteUrl(sabahHospitalLogo),
      description: "A new 300-bed block with a cancer centre and heliport.",
      introduction:
        "The extension adds a 12-storey, 300-bed block to Sabah General Hospital, with a " +
        "cancer treatment centre, eight operating theatres and a rooftop heliport. The " +
        "existing hospital stays open throughout construction.",
      client: "Ministry of Health Malaysia",
      location: "Kota Kinabalu, Sabah, Malaysia",
      manager: "Jonathan Liew",
      start_date: "3 Mar 2025",
      end_date: "30 Sep 2028",
      budget: "RM 980,000,000",
      status: "In progress",
      website: "https://www.sabahgh-extension.example.com",
      contact_email: "site@sabahgh-extension.example.com",
      contact_phone: "+60 88 517 555",
      project_number: "2025003008",
      asset_tag: "SBGH4-AT-000902",
      item_number: "9551234000041",
      postcode: "88586",
    },
    sources: buildProjectSources({
      prefix: "SGH",
      priceFactor: 1.1,
      dayShift: 70,
      rowCount: 18,
      milestones: [
        ["Foundation works", "Structure", "Jonathan Liew", "Done", 100, "2025-09-30"],
        ["Structure to level 6", "Structure", "Rosnah Abdul", "Done", 100, "2026-05-31"],
        ["Structure to roof", "Structure", "Rosnah Abdul", "In progress", 55, "2026-12-31"],
        ["Medical gas and M&E", "Services", "Kevin Chong", "In progress", 20, "2027-08-31"],
        ["Operating theatres fit-out", "Fit-out", "Dr. Mary Ann", "Not started", 0, "2028-03-31"],
        ["Handover", "Handover", "Jonathan Liew", "Not started", 0, "2028-09-30"],
      ],
    }),
  },
];
