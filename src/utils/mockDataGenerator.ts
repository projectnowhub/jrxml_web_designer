import type { ReportParameter, ReportField } from '../types';

// --- Data Pools ---

const FULL_NAMES = [
  'James Carter', 'Emily Clarke', 'Daniel Brooks', 'Olivia Bennett', 'Michael Turner',
  'Sophia Hughes', 'Ethan Walker', 'Grace Mitchell', 'Lucas Reed', 'Chloe Parker',
  'Nathan Scott', 'Hannah Wright', 'Ryan Cooper', 'Isabella Ward', 'Adam Foster',
  'Lily Morgan', 'Samuel Price', 'Zoe Richardson', 'Henry Collins', 'Ava Stewart',
];

const STATES = [
  'California', 'Texas', 'Florida', 'New York', 'Illinois', 'Pennsylvania', 'Ohio',
  'Georgia', 'North Carolina', 'Michigan', 'Washington', 'Arizona', 'Massachusetts', 'Colorado',
];

const CITIES_BY_STATE: Record<string, string[]> = {
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Oakland'],
  'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
  'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Tallahassee'],
  'New York': ['New York City', 'Buffalo', 'Rochester', 'Albany', 'Syracuse'],
  'Illinois': ['Chicago', 'Springfield', 'Naperville', 'Peoria', 'Rockford'],
  'Washington': ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue'],
};

const CITIES = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix',
  'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin',
];

const STATUS_OPTIONS = ['Completed', 'In Progress', 'Pending', 'Cancelled'];

const COMPANY_NAMES = [
  'Summit Technologies', 'Vertex Trading', 'Horizon Information', 'Meridian Culture', 'Beacon Education',
  'Harmony Healthcare', 'Pinnacle Finance', 'Grandview Manufacturing', 'Radiant Electronics', 'Momentum Logistics',
  'Steadfast Industries', 'Visionary Technologies', 'Origin Trading', 'Everbright Appliances', 'United Heavy Industries',
];

const STREET_NAMES = [
  'Main Street', 'Park Avenue', 'Oak Street', 'Maple Avenue', 'Elm Street',
  'Cedar Road', 'Washington Street', 'Lincoln Avenue', 'Lake Drive', 'Hill Road',
];

const DESCRIPTIONS = [
  'The project is progressing smoothly, with all tasks moving forward as planned',
  'The plan needs further optimization to improve efficiency',
  'The initial review has been completed and is awaiting final confirmation',
  'The data has been organized and is ready for approval submission',
  'Performance this quarter has been strong, exceeding the expected targets',
  'It is recommended to strengthen team collaboration and improve project management',
  'Requirements analysis has been completed and development has begun',
  'All metrics have met the expected standards',
];

const EMAIL_DOMAINS = ['example.com', 'example.net', 'demo.com', 'sample.org'];

// --- Helper Functions ---

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomName(): string {
  return randomPick(FULL_NAMES);
}

// Fictional number in the reserved 555 range, e.g. 555-201-4837
function randomPhone(): string {
  const digits = (count: number) =>
    Array.from({ length: count }, () => randomInt(0, 9)).join('');
  return `555-${digits(3)}-${digits(4)}`;
}

function randomEmail(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let name = '';
  const len = randomInt(4, 10);
  for (let i = 0; i < len; i++) {
    name += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${name}@${randomPick(EMAIL_DOMAINS)}`;
}

function randomAddress(): string {
  const state = randomPick(Object.keys(CITIES_BY_STATE));
  const city = randomPick(CITIES_BY_STATE[state] || ['Springfield']);
  const street = randomPick(STREET_NAMES);
  const num = randomInt(1, 200);
  return `${num}, ${street}, ${city}, ${state}`;
}

function randomDate(): string {
  const now = Date.now();
  const threeYears = 3 * 365 * 24 * 60 * 60 * 1000;
  const ts = now - Math.random() * threeYears;
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function randomCompanyName(): string {
  const prefix = randomPick(['Global', 'National', 'Eastern', 'New', 'Grand', 'Prime', 'Everlasting', 'Golden', 'Rich', 'Bright']);
  const name = randomPick(COMPANY_NAMES);
  const suffix = randomPick(['Ltd.', 'Inc.', 'Group', 'Technologies Ltd.']);
  return `${prefix} ${name} ${suffix}`;
}

let seqId = 1;

function resetSeqId(): void {
  seqId = 1;
}

// --- Name Heuristic Rules ---

interface NameRule {
  patterns: RegExp;
  generator: () => any;
}

const NAME_RULES: NameRule[] = [
  { patterns: /name|customer|employee|user/i, generator: randomName },
  { patterns: /phone|tel|mobile/i, generator: randomPhone },
  { patterns: /email/i, generator: randomEmail },
  { patterns: /address/i, generator: randomAddress },
  { patterns: /date|time/i, generator: randomDate },
  { patterns: /amount|price|cost|salary|total|balance/i, generator: () => randomInt(10, 99999) },
  { patterns: /quantity|qty/i, generator: () => randomInt(1, 999) },
  { patterns: /^id$|^no$|number/i, generator: () => seqId++ },
  { patterns: /status/i, generator: () => randomPick(STATUS_OPTIONS) },
  { patterns: /city/i, generator: () => randomPick(CITIES) },
  { patterns: /state|province/i, generator: () => randomPick(STATES) },
  { patterns: /company|department/i, generator: randomCompanyName },
  { patterns: /description|remark|note/i, generator: () => randomPick(DESCRIPTIONS) },
  { patterns: /sex|gender/i, generator: () => randomPick(['Male', 'Female']) },
  { patterns: /age/i, generator: () => randomInt(18, 65) },
];

// --- Type-based Fallback ---

function generateByType(className: string): any {
  switch (className) {
    case 'java.lang.String':
      return `Data${randomInt(1000, 9999)}`;
    case 'java.lang.Integer':
    case 'java.lang.Long':
      return randomInt(1, 9999);
    case 'java.lang.Double':
    case 'java.lang.Float':
      return Math.round(Math.random() * 99999 * 100) / 100;
    case 'java.lang.Boolean':
      return Math.random() > 0.5;
    case 'java.util.Date':
      return randomDate();
    default:
      return `Value${randomInt(1, 999)}`;
  }
}

// --- Public API ---

export function generateMockValue(fieldName: string, className: string): any {
  const lowerName = fieldName.toLowerCase();

  for (const rule of NAME_RULES) {
    if (rule.patterns.test(lowerName)) {
      return rule.generator();
    }
  }

  return generateByType(className);
}

export function generateMockParameters(parameters: ReportParameter[]): Record<string, any> {
  resetSeqId();
  const result: Record<string, any> = {};
  for (const param of parameters) {
    if (param.defaultValue) {
      result[param.name] = param.defaultValue;
    } else {
      result[param.name] = generateMockValue(param.name, param.class);
    }
  }
  return result;
}

export function generateMockDataSource(fields: ReportField[], rowCount: number): Record<string, any>[] {
  resetSeqId();
  const rows: Record<string, any>[] = [];
  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, any> = {};
    for (const field of fields) {
      row[field.name] = generateMockValue(field.name, field.class);
    }
    rows.push(row);
  }
  return rows;
}
