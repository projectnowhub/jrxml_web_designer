import type { ReportParameter, ReportField } from '../types';

// --- Data Pools ---

// NOTE: These surname/given-name pools intentionally generate Chinese-style names
// (short, 2-4 characters). Kept as-is because generateMockValue's output length
// (2-4 chars) is asserted directly in mockDataGenerator.test.ts.
const CHINESE_SURNAMES = [
  '王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴',
  '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗',
  '梁', '宋', '郑', '谢', '韩', '唐', '冯', '于', '董', '萧',
  '程', '曹', '袁', '邓', '许', '傅', '沈', '曾', '彭', '吕',
  '苏', '卢', '蒋', '蔡', '贾', '丁', '魏', '薛', '叶', '阎',
];

// NOTE: This pool is currently unused (superseded by GIVEN_NAME_CHARS below),
// but its content is translated for consistency since it holds no functional
// (regex-matching) role and no test depends on its exact values.
const CHINESE_GIVEN_CHARS = [
  'James', 'Mary', 'Anna', 'Grace', 'Amy', 'Claire', 'Lily', 'Frank', 'Leo', 'Owen',
  'Ivy', 'Victor', 'George', 'Jack', 'Jenny', 'Toby', 'Chad', 'Marcus', 'Rose', 'Hazel',
  'Peter', 'Gary', 'Rita', 'Wendy', 'Howard', 'Felix', 'Lena', 'Rachel', 'Vincent', 'Nathan',
  'Henry', 'Nolan', 'Miles', 'Jasmine', 'Olive', 'Faith', 'Lila', 'Bruce', 'Derek', 'Miles',
  'Vincent', 'Simon', 'Wesley', 'Sean', 'Alan', 'Caleb', 'Adrian', 'Ruby', 'Chloe', 'Violet',
  'Iris', 'Elena', 'Nadia', 'Sophia', 'Kayla', 'Megan', 'Erica', 'Kayla', 'Mia', 'Skylar',
  'Skyler', 'Justin', 'Hunter', 'Dylan', 'Zane', 'Logan', 'Colton', 'Elliot', 'Ashton', 'Dawn',
];

const CHINESE_PROVINCES = [
  'New York', 'California', 'Texas', 'Florida', 'Illinois', 'Pennsylvania', 'Ohio',
  'Georgia', 'North Carolina', 'Michigan', 'New Jersey', 'Virginia', 'Washington', 'Arizona',
  'Massachusetts', 'Tennessee', 'Indiana', 'Missouri', 'Maryland', 'Wisconsin', 'Colorado',
  'Minnesota', 'South Carolina', 'Alabama', 'Louisiana', 'Kentucky', 'Oregon',
  'Oklahoma', 'Connecticut', 'Utah', 'Nevada', 'Iowa',
];

const CHINESE_CITIES: Record<string, string[]> = {
  'New York': ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'],
  'California': ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Oakland'],
  'Texas': ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
  'Florida': ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Tallahassee'],
  'Illinois': ['Chicago', 'Springfield', 'Naperville', 'Peoria', 'Rockford'],
  'Pennsylvania': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading'],
  'Ohio': ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron'],
  'Georgia': ['Atlanta', 'Savannah', 'Augusta', 'Macon', 'Athens'],
  'North Carolina': ['Charlotte', 'Raleigh', 'Durham', 'Greensboro', 'Asheville'],
  'Michigan': ['Detroit', 'Grand Rapids', 'Ann Arbor', 'Lansing', 'Flint'],
};

const STATUS_OPTIONS = ['Completed', 'In Progress', 'Pending', 'Cancelled'];

const COMPANY_NAMES = [
  'Summit Technologies', 'Vertex Trading', 'Horizon Information', 'Meridian Culture', 'Beacon Education',
  'Harmony Healthcare', 'Pinnacle Finance', 'Grandview Manufacturing', 'Radiant Electronics', 'Momentum Logistics',
  'Steadfast Industries', 'Visionary Technologies', 'Origin Trading', 'Everbright Appliances', 'United Heavy Industries',
];

const STREET_NAMES = ['Main Street', 'Park Avenue', 'Oak Street', 'Maple Avenue', 'Elm Street', 'Cedar Road', 'Washington Street', 'Lincoln Avenue'];

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

const EMAIL_DOMAINS = ['example.com', 'test.cn', 'demo.com', 'sample.org'];

// NOTE: Kept as Chinese characters — see note above on CHINESE_SURNAMES/CHINESE_GIVEN_CHARS.
const GIVEN_NAME_CHARS = '伟芳娜敏静丽强磊洋艳勇军杰涛超明霞文华飞玲红远宁安怡乐康泰瑞祥福禄寿喜春晓晨旭阳辉昊辰宇帆睿哲';

// --- Helper Functions ---

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomChineseName(): string {
  const surname = randomPick(CHINESE_SURNAMES);
  const givenLen = Math.random() > 0.5 ? 2 : 1;
  let given = '';
  for (let i = 0; i < givenLen; i++) {
    given += randomPick(Array.from(GIVEN_NAME_CHARS));
  }
  return surname + given;
}

function randomPhone(): string {
  const prefixes = ['130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
    '150', '151', '152', '153', '155', '156', '157', '158', '159',
    '170', '176', '177', '178',
    '180', '181', '182', '183', '184', '185', '186', '187', '188', '189'];
  const prefix = randomPick(prefixes);
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += randomInt(0, 9);
  }
  return prefix + suffix;
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
  const province = randomPick(Object.keys(CHINESE_CITIES));
  const city = randomPick(CHINESE_CITIES[province] || ['Downtown']);
  const street = randomPick(STREET_NAMES);
  const num = randomInt(1, 200);
  return `${num} ${street}, ${city}, ${province}`;
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
  const suffix = randomPick(['Ltd.', 'Co., Ltd.', 'Group', 'Technologies Ltd.']);
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

// NOTE: The Chinese keywords in these regex patterns (姓名, 电话, 邮箱, ...) are
// intentionally left untranslated. They match against actual field/parameter
// names that come from a user's real (often Chinese-language) JRXML report
// definitions, so removing them would break mock-data heuristics for those
// reports. This is functional matching logic, not display text.
const NAME_RULES: NameRule[] = [
  { patterns: /name|姓名|名称|员工|用户|客户|人名/i, generator: randomChineseName },
  { patterns: /phone|tel|电话|手机|联系方式/i, generator: randomPhone },
  { patterns: /email|邮箱|电子邮件/i, generator: randomEmail },
  { patterns: /address|地址|住址|住所|家庭住址/i, generator: randomAddress },
  { patterns: /date|日期|时间|出生|创建时间|更新时间|录入时间|发生时间|申请时间|审批时间/i, generator: randomDate },
  { patterns: /amount|金额|价格|费用|工资|收入|支出|余额|总价|单价|成本|利润|预算|总额/i, generator: () => randomInt(10, 99999) },
  { patterns: /quantity|数量|数目|件数|个数|数量/i, generator: () => randomInt(1, 999) },
  { patterns: /^id$|编号|序号|流水号/i, generator: () => seqId++ },
  { patterns: /status|状态/i, generator: () => randomPick(STATUS_OPTIONS) },
  { patterns: /city|城市/i, generator: () => { const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'Austin']; return randomPick(cities); } },
  { patterns: /province|省份/i, generator: () => randomPick(CHINESE_PROVINCES) },
  { patterns: /company|公司|企业|单位|部门/i, generator: randomCompanyName },
  { patterns: /description|描述|备注|说明|摘要|内容|信息/i, generator: () => randomPick(DESCRIPTIONS) },
  { patterns: /sex|gender|性别/i, generator: () => randomPick(['Male', 'Female']) },
  { patterns: /age|年龄/i, generator: () => randomInt(18, 65) },
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
