import { RoleId } from "@/components/shared/role-switcher";

export interface SampleAccount {
  id: string;
  name: string;
  email: string;
  roleId: RoleId;
  roleLabel: string;
  dutyStation: string;
  badge: string;
  category: "PRIMARY" | "RESPONDER" | "WELFARE" | "OPERATIONS";
  phone: string;
}

export const SAMPLE_ACCOUNTS: SampleAccount[] = [
  // 1. PRIMARY ROLES
  {
    id: "acc_student_01",
    name: "Priya Sharma",
    email: "student.priya@campus-sos.edu",
    roleId: "student",
    roleLabel: "Student Body",
    dutyStation: "Hostel Block 4, Room 312",
    badge: "STUDENT ID: ST-2024-8841",
    category: "PRIMARY",
    phone: "+91 98765 43210",
  },
  {
    id: "acc_chief_proctor_01",
    name: "Col. Vikram Malhotra",
    email: "chief.proctor@campus-sos.edu",
    roleId: "chief_proctor",
    roleLabel: "Chief Proctor",
    dutyStation: "Central Proctorate Office",
    badge: "PROCTORATE COMM-01",
    category: "PRIMARY",
    phone: "+91 94140 11223",
  },
  {
    id: "acc_campus_admin_01",
    name: "Dr. Rajesh Khanna",
    email: "admin.office@campus-sos.edu",
    roleId: "campus_admin",
    roleLabel: "Campus Administration",
    dutyStation: "Main Administrative Building, Room 101",
    badge: "ADMIN EXECUTIVE",
    category: "PRIMARY",
    phone: "+91 94140 55667",
  },

  // 2. EMERGENCY RESPONDERS
  {
    id: "acc_security_01",
    name: "Inspector K. Singh",
    email: "security.singh@campus-sos.edu",
    roleId: "security",
    roleLabel: "Security Patrol",
    dutyStation: "Gate 1 Main Dispatch Post",
    badge: "PATROL CALLSIGN SEC-ALPHA",
    category: "RESPONDER",
    phone: "+91 98290 99887",
  },
  {
    id: "acc_medical_01",
    name: "Dr. Anita Roy",
    email: "medical.roy@campus-sos.edu",
    roleId: "medical",
    roleLabel: "Medical Response",
    dutyStation: "Campus Health Center & Emergency Ward",
    badge: "CHIEF MEDICAL OFFICER",
    category: "RESPONDER",
    phone: "+91 98291 11224",
  },
  {
    id: "acc_fire_01",
    name: "Officer Arjun Mehta",
    email: "fire.safety@campus-sos.edu",
    roleId: "fire_safety",
    roleLabel: "Fire & Chemical Safety",
    dutyStation: "Central Fire Depot / Science Quadrant",
    badge: "FIRE TACTICAL LEAD",
    category: "RESPONDER",
    phone: "+91 94133 77889",
  },

  // 3. SAFETY & WELFARE
  {
    id: "acc_women_safety_01",
    name: "Prof. Sunita Rao",
    email: "women.safety@campus-sos.edu",
    roleId: "women_safety",
    roleLabel: "Women Safety & ICC",
    dutyStation: "ICC Confidential Office (Block C)",
    badge: "ICC PRESIDING OFFICER",
    category: "WELFARE",
    phone: "+91 94144 33221",
  },
  {
    id: "acc_men_safety_01",
    name: "Prof. Devendra Joshi",
    email: "men.safety@campus-sos.edu",
    roleId: "men_safety",
    roleLabel: "Men Harassment & Welfare",
    dutyStation: "Student Welfare Wing",
    badge: "WELFARE COUNSELOR",
    category: "WELFARE",
    phone: "+91 94148 44556",
  },
  {
    id: "acc_student_council_01",
    name: "Rohan Verma",
    email: "student.council@campus-sos.edu",
    roleId: "student_council",
    roleLabel: "Student Council",
    dutyStation: "Student Activity Centre, Room 12",
    badge: "PRESIDENT, STUDENT COUNCIL",
    category: "WELFARE",
    phone: "+91 98292 66778",
  },

  // 4. CAMPUS OPERATIONS
  {
    id: "acc_infra_01",
    name: "Er. Ramesh Patel",
    email: "infra.patel@campus-sos.edu",
    roleId: "facilities",
    roleLabel: "Infrastructure & Works",
    dutyStation: "Estate Office & Maintenance Yard",
    badge: "CHIEF ESTATE ENGINEER",
    category: "OPERATIONS",
    phone: "+91 94145 66778",
  },
  {
    id: "acc_transport_01",
    name: "Supervisor Mohit Sen",
    email: "transport.sen@campus-sos.edu",
    roleId: "transport",
    roleLabel: "Transportation & Traffic",
    dutyStation: "Campus Transit Hub / North Parking Depot",
    badge: "TRANSIT DISPATCHER",
    category: "OPERATIONS",
    phone: "+91 98295 44332",
  },
  {
    id: "acc_it_01",
    name: "Neha Kapoor",
    email: "it.digital@campus-sos.edu",
    roleId: "it_digital",
    roleLabel: "IT & Digital Safety",
    dutyStation: "Central Computer Centre, Room 204",
    badge: "CYBER INCIDENT LEAD",
    category: "OPERATIONS",
    phone: "+91 94147 88990",
  },
];

export function getAccountByRoleId(roleId: RoleId): SampleAccount | undefined {
  return SAMPLE_ACCOUNTS.find((acc) => acc.roleId === roleId);
}

export function getAccountByEmail(email: string): SampleAccount | undefined {
  return SAMPLE_ACCOUNTS.find((acc) => acc.email.toLowerCase() === email.toLowerCase());
}

/**
 * Development test password helper strictly for local demo mode authentication
 */
export function getDevTestPassword(): string {
  return "Password123!";
}
