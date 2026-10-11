import * as fs from 'fs';
import * as path from 'path';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';

export interface DevDbData {
  users: any[];
  teams: any[];
  teamMembers: any[];
  incidents: any[];
  incidentDrafts: any[];
  incidentLocations: any[];
  attachments: any[];
  outboxEvents: any[];
  auditLogs: any[];
  auditEvents: any[];
  breakGlassRequests: any[];
  notifications: any[];
  notificationDeliveries: any[];
  hotlines: any[];
  settings: any[];
  assignments: any[];
  responderProfiles: any[];
  incidentTeams: any[];
  routingDecisions: any[];
  aiClassifications: any[];
  [key: string]: any;
}

export class DevStore {
  private dataDir = path.resolve(__dirname, '../../data');
  private dbPath = path.resolve(__dirname, '../../data/campus_sos_dev_db.json');
  public data: DevDbData = {
    users: [],
    teams: [],
    teamMembers: [],
    incidents: [],
    incidentDrafts: [],
    incidentLocations: [],
    attachments: [],
    outboxEvents: [],
    auditLogs: [],
    auditEvents: [],
    breakGlassRequests: [],
    notifications: [],
    notificationDeliveries: [],
    hotlines: [],
    settings: [],
    assignments: [],
    responderProfiles: [],
    incidentTeams: [],
    routingDecisions: [],
    aiClassifications: [],
  };

  constructor() {
    this.ensureDataDir();
    this.load();
    this.seedDefaults();
  }

  private ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private lastMtime: number = 0;

  public reloadIfModified() {
    if (fs.existsSync(this.dbPath)) {
      try {
        const stats = fs.statSync(this.dbPath);
        if (stats.mtimeMs !== this.lastMtime) {
          const raw = fs.readFileSync(this.dbPath, 'utf8');
          const parsed = JSON.parse(raw);
          this.data = { ...this.data, ...parsed };
          if (!this.data.auditEvents || this.data.auditEvents.length === 0) {
            this.data.auditEvents = this.data.auditLogs || [];
          }
          this.lastMtime = stats.mtimeMs;
        }
      } catch (e) {
        // ignore concurrent read/write errors
      }
    }
  }

  private load() {
    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.data, ...parsed };
        if (!this.data.auditEvents || this.data.auditEvents.length === 0) {
          this.data.auditEvents = this.data.auditLogs || [];
        }
        this.lastMtime = fs.statSync(this.dbPath).mtimeMs;
      } catch (e) {
        console.warn('Failed to parse dev db JSON, re-initializing defaults.');
      }
    }
  }

  public save() {
    try {
      this.ensureDataDir();
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
      if (fs.existsSync(this.dbPath)) {
        this.lastMtime = fs.statSync(this.dbPath).mtimeMs;
      }
    } catch (e) {
      console.error('Failed to save dev db:', e);
    }
  }

  public createSnapshot(): string {
    return JSON.stringify(this.data);
  }

  public restoreSnapshot(snapshot: string): void {
    try {
      this.data = JSON.parse(snapshot);
      this.save();
    } catch (e) {
      console.error('Failed to restore dev db snapshot:', e);
    }
  }

  private seedDefaults() {
    // 1. Teams
    const canonicalTeams = [
      { id: 'team_admin_01', code: 'CAMPUS_ADMIN', name: 'Campus Administration', dutyState: 'AVAILABLE', isEnabled: true, isRestricted: false },
      { id: 'team_proctor_01', code: 'CHIEF_PROCTOR', name: 'Chief Proctor Office', dutyState: 'AVAILABLE', isEnabled: true, isRestricted: false },
      { id: 'team_sec_01', code: 'SECURITY', name: 'Security & Patrol', dutyState: 'AVAILABLE', isEnabled: true, isRestricted: false },
      { id: 'team_med_01', code: 'MEDICAL', name: 'Medical Response Unit', dutyState: 'AVAILABLE', isEnabled: true, isRestricted: false },
      { id: 'team_fire_01', code: 'FIRE_SAFETY', name: 'Fire & Chemical Safety', dutyState: 'AVAILABLE', isEnabled: true, isRestricted: false },
      { id: 'team_women_01', code: 'WOMEN_SAFETY', name: 'Women Safety & ICC', dutyState: 'AVAILABLE', isEnabled: true, isRestricted: true },
      { id: 'team_men_01', code: 'MEN_SAFETY', name: 'Men Harassment & Welfare', dutyState: 'AVAILABLE', isEnabled: true, isRestricted: true },
      { id: 'team_council_01', code: 'STUDENT_COUNCIL', name: 'Student Council', dutyState: 'AVAILABLE', isEnabled: true, isRestricted: false },
      { id: 'team_infra_01', code: 'INFRASTRUCTURE', name: 'Infrastructure & Works', dutyState: 'AVAILABLE', isEnabled: true, isRestricted: false },
      { id: 'team_trans_01', code: 'TRANSPORTATION', name: 'Transportation & Traffic', dutyState: 'AVAILABLE', isEnabled: true, isRestricted: false },
      { id: 'team_it_01', code: 'IT_DIGITAL', name: 'IT & Digital Safety', dutyState: 'AVAILABLE', isEnabled: true, isRestricted: false },
    ];

    for (const t of canonicalTeams) {
      const existing = this.data.teams.find((e) => e.code === t.code);
      if (!existing) {
        this.data.teams.push(t);
      } else {
        if (existing.isEnabled === undefined) existing.isEnabled = true;
        if (existing.isRestricted === undefined) existing.isRestricted = t.isRestricted;
      }
    }

    // 2. Canonical Sample Users (All 12 Roles)
    // Pre-computed valid argon2 hash for 'Password123!'
    const testHash = '$argon2id$v=19$m=65536,t=3,p=4$EasqmRVCYZcVXNblWL5SnA$26XUGZ2kIuSzUGpL4wfInqNIHNOF/RcGY4AucDnxNSY';

    const sampleUsers = [
      {
        id: 'usr_student_01',
        email: 'student.priya@campus-sos.edu',
        fullName: 'Priya Sharma',
        role: 'STUDENT',
        userType: 'student',
        isActive: true,
        phone: '+91 98765 43210',
        teamCode: null,
      },
      {
        id: 'usr_student_02',
        email: 'student.aarav@campus-sos.edu',
        fullName: 'Aarav Patel',
        role: 'STUDENT',
        userType: 'student',
        isActive: true,
        phone: '+91 98765 43211',
        teamCode: null,
      },
      {
        id: 'usr_proctor_01',
        email: 'chief.proctor@campus-sos.edu',
        fullName: 'Col. Vikram Malhotra',
        role: 'CHIEF_PROCTOR',
        userType: 'staff',
        isActive: true,
        phone: '+91 94140 11223',
        teamCode: 'CHIEF_PROCTOR',
      },
      {
        id: 'usr_admin_01',
        email: 'admin.office@campus-sos.edu',
        fullName: 'Dr. Rajesh Khanna',
        role: 'CAMPUS_ADMIN',
        userType: 'staff',
        isActive: true,
        phone: '+91 94140 55667',
        teamCode: 'CAMPUS_ADMIN',
      },
      {
        id: 'usr_sec_01',
        email: 'security.singh@campus-sos.edu',
        fullName: 'Inspector K. Singh',
        role: 'SECURITY',
        userType: 'personnel',
        isActive: true,
        phone: '+91 98290 99887',
        teamCode: 'SECURITY',
      },
      {
        id: 'usr_med_01',
        email: 'medical.roy@campus-sos.edu',
        fullName: 'Dr. Anita Roy',
        role: 'MEDICAL',
        userType: 'personnel',
        isActive: true,
        phone: '+91 98291 11224',
        teamCode: 'MEDICAL',
      },
      {
        id: 'usr_fire_01',
        email: 'fire.safety@campus-sos.edu',
        fullName: 'Officer Arjun Mehta',
        role: 'FIRE_SAFETY',
        userType: 'personnel',
        isActive: true,
        phone: '+91 94133 77889',
        teamCode: 'FIRE_SAFETY',
      },
      {
        id: 'usr_women_01',
        email: 'women.safety@campus-sos.edu',
        fullName: 'Prof. Sunita Rao',
        role: 'WOMEN_SAFETY',
        userType: 'staff',
        isActive: true,
        phone: '+91 94144 33221',
        teamCode: 'WOMEN_SAFETY',
      },
      {
        id: 'usr_men_01',
        email: 'men.safety@campus-sos.edu',
        fullName: 'Prof. Devendra Joshi',
        role: 'MEN_SAFETY',
        userType: 'staff',
        isActive: true,
        phone: '+91 94148 44556',
        teamCode: 'MEN_SAFETY',
      },
      {
        id: 'usr_council_01',
        email: 'student.council@campus-sos.edu',
        fullName: 'Rohan Verma',
        role: 'STUDENT_COUNCIL',
        userType: 'student',
        isActive: true,
        phone: '+91 98292 66778',
        teamCode: 'STUDENT_COUNCIL',
      },
      {
        id: 'usr_infra_01',
        email: 'infra.patel@campus-sos.edu',
        fullName: 'Er. Ramesh Patel',
        role: 'INFRASTRUCTURE',
        userType: 'staff',
        isActive: true,
        phone: '+91 94145 66778',
        teamCode: 'INFRASTRUCTURE',
      },
      {
        id: 'usr_trans_01',
        email: 'transport.sen@campus-sos.edu',
        fullName: 'Supervisor Mohit Sen',
        role: 'TRANSPORTATION',
        userType: 'staff',
        isActive: true,
        phone: '+91 98295 44332',
        teamCode: 'TRANSPORTATION',
      },
      {
        id: 'usr_it_01',
        email: 'it.digital@campus-sos.edu',
        fullName: 'Neha Kapoor',
        role: 'IT_DIGITAL',
        userType: 'staff',
        isActive: true,
        phone: '+91 94147 88990',
        teamCode: 'IT_DIGITAL',
      },
    ];

    for (const u of sampleUsers) {
      const existing = this.data.users.find((x) => x.email === u.email);
      if (!existing) {
        this.data.users.push({
          ...u,
          passwordHash: testHash,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        existing.passwordHash = testHash;
      }

      // Link team memberships
      if (u.teamCode) {
        const team = this.data.teams.find((t) => t.code === u.teamCode);
        if (team && !this.data.teamMembers.some((tm) => tm.userId === u.id && tm.teamId === team.id)) {
          const memberId = `tm_${u.id}_${team.id}`;
          this.data.teamMembers.push({
            id: memberId,
            userId: u.id,
            teamId: team.id,
            role: 'LEAD',
            joinedAt: new Date().toISOString(),
            leftAt: null,
          });
          if (!this.data.responderProfiles.some((rp) => rp.memberId === memberId)) {
            this.data.responderProfiles.push({
              memberId,
              dutyState: 'AVAILABLE',
              dutyStateChangedAt: new Date().toISOString(),
              currentAssignmentCount: 0,
              skills: [],
            });
          }
        }
      }
    }

    // 3. Emergency Hotlines (Development sample mocks - unverified in production)
    const canonicalHotlines = [
      {
        id: 'hotline_police_01',
        label: 'Central Campus Police & Security Control',
        phone: '+91 1800-226-787',
        description: '[DEMO / TEST CONTACT ONLY - Unverified] 24/7 immediate security response and campus patrol dispatch',
        sortOrder: 1,
        is24x7: true,
        isActive: true,
      },
      {
        id: 'hotline_health_01',
        label: 'Campus Health Clinic & Ambulance',
        phone: '+91 1800-226-911',
        description: '[DEMO / TEST CONTACT ONLY - Unverified] Emergency trauma, ambulance dispatch, and medical triage',
        sortOrder: 2,
        is24x7: true,
        isActive: true,
      },
      {
        id: 'hotline_women_01',
        label: 'Women Safety Cell & Confidential Support',
        phone: '+91 1800-226-100',
        description: '[DEMO / TEST CONTACT ONLY - Unverified] Confidential reporting and counseling',
        sortOrder: 3,
        is24x7: true,
        isActive: true,
      },
      {
        id: 'hotline_proctor_01',
        label: 'Chief Proctor Grievance Helpline',
        phone: '+91 1800-226-444',
        description: '[DEMO / TEST CONTACT ONLY - Unverified] Anti-ragging escalation and student dispute resolution',
        sortOrder: 4,
        is24x7: true,
        isActive: true,
      },
    ];

    if (!this.data.hotlines) {
      this.data.hotlines = [];
    }
    for (const h of canonicalHotlines) {
      if (!this.data.hotlines.some((existing) => existing.id === h.id)) {
        this.data.hotlines.push(h);
      }
    }

    this.save();
  }

  private resolveCollectionName(name: string): string {
    const map: Record<string, string> = {
      user: 'users',
      team: 'teams',
      teamMember: 'teamMembers',
      responderProfile: 'responderProfiles',
      incident: 'incidents',
      incidentDraft: 'incidentDrafts',
      incidentLocation: 'incidentLocations',
      attachment: 'attachments',
      outboxEvent: 'outboxEvents',
      auditLog: 'auditEvents',
      auditEvent: 'auditEvents',
      breakGlassRequest: 'breakGlassRequests',
      notification: 'notifications',
      notificationDelivery: 'notificationDeliveries',
      session: 'sessions',
      incidentStatusHistory: 'incidentStatusHistories',
      assignment: 'assignments',
      hotline: 'hotlines',
      systemSetting: 'systemSettings',
      broadcastNotice: 'broadcastNotices',
      incidentTeam: 'incidentTeams',
      routingDecision: 'routingDecisions',
      aiClassification: 'aiClassifications',
    };
    return map[name] || (name.endsWith('s') ? name : `${name}s`);
  }

  private attachIncludes(item: any, collection: string, include: any): any {
    if (!item || !include) return item;
    const cloned = { ...item };
    if (collection === 'users') {
      if (include.teamMembers) {
        cloned.teamMembers = (this.data.teamMembers || [])
          .filter((tm: any) => tm.userId === item.id)
          .map((tm: any) => {
            const team = (this.data.teams || []).find((t: any) => t.id === tm.teamId);
            return {
              ...tm,
              team: team || { id: tm.teamId, code: 'CAMPUS_ADMIN', name: 'Campus Administration' },
            };
          });
      }
    }
    if (collection === 'incidents') {
      if (include.incidentLocations || include.location) {
        const locs = (this.data.incidentLocations || []).filter((l: any) => l.incidentId === item.id);
        cloned.incidentLocations = locs;
        cloned.location = locs[0] || null;
      }
      if (include.attachments) {
        cloned.attachments = (this.data.attachments || []).filter((a: any) => a.incidentId === item.id);
      }
      if (include.incidentTeams) {
        cloned.incidentTeams = (this.data.incidentTeams || [])
          .filter((it: any) => it.incidentId === item.id)
          .map((it: any) => {
            const team = (this.data.teams || []).find((t: any) => t.id === it.teamId);
            return {
              ...it,
              team: team || { id: it.teamId, code: 'ADMIN', name: 'Campus Team' },
            };
          });
      }
      if (include.routingDecisions) {
        cloned.routingDecisions = (this.data.routingDecisions || []).filter((rd: any) => rd.incidentId === item.id);
      }
      if (include.statusHistory) {
        cloned.statusHistory = (this.data.incidentStatusHistories || []).filter((sh: any) => sh.incidentId === item.id);
      }
      if (include.reporter) {
        cloned.reporter = (this.data.users || []).find((u: any) => u.id === item.reporterId) || null;
      }
    }
    if (collection === 'teamMembers') {
      if (include.responderProfile) {
        cloned.responderProfile = (this.data.responderProfiles || []).find((rp: any) => rp.memberId === item.id) || {
          memberId: item.id,
          dutyState: 'AVAILABLE',
          currentAssignmentCount: 0,
        };
      }
      if (include.user) {
        cloned.user = (this.data.users || []).find((u: any) => u.id === item.userId) || null;
      }
      if (include.team) {
        cloned.team = (this.data.teams || []).find((t: any) => t.id === item.teamId) || null;
      }
    }
    if (collection === 'assignments') {
      if (include.member) {
        const mem = (this.data.teamMembers || []).find((tm: any) => tm.id === item.memberId);
        cloned.member = mem
          ? this.attachIncludes(mem, 'teamMembers', typeof include.member === 'object' ? include.member.include || include.member : {})
          : null;
      }
      if (include.team) {
        cloned.team = (this.data.teams || []).find((t: any) => t.id === item.teamId) || null;
      }
      if (include.incident) {
        cloned.incident = (this.data.incidents || []).find((inc: any) => inc.id === item.incidentId) || null;
      }
    }
    if (collection === 'notifications') {
      if (include.deliveries) {
        cloned.deliveries = (this.data.notificationDeliveries || []).filter((d: any) => d.notificationId === item.id);
      }
    }
    return cloned;
  }

  // Model accessors
  public createModelHandler(tableName: string) {
    const self = this;
    const collection = self.resolveCollectionName(tableName);
    if (!(self.data as any)[collection]) {
      (self.data as any)[collection] = [];
    }

    return {
      async findUnique(args: any = {}) {
        self.reloadIfModified();
        const list = (self.data as any)[collection] || [];
        const where = args.where || {};
        const found = list.find((item: any) => self.matchWhere(item, where)) || null;
        return args.include ? self.attachIncludes(found, collection, args.include) : found;
      },
      async findFirst(args: any = {}) {
        self.reloadIfModified();
        const list = (self.data as any)[collection] || [];
        const where = args.where || {};
        const found = list.find((item: any) => self.matchWhere(item, where)) || null;
        return args.include ? self.attachIncludes(found, collection, args.include) : found;
      },
      async findMany(args: any = {}) {
        self.reloadIfModified();
        const list = (self.data as any)[collection] || [];
        const where = args.where || {};
        let res = list.filter((item: any) => self.matchWhere(item, where));
        if (args.orderBy) {
          res = self.applyOrderBy(res, args.orderBy);
        }
        if (args.skip) {
          res = res.slice(args.skip);
        }
        if (args.take) {
          res = res.slice(0, args.take);
        }
        if (args.include) {
          res = res.map((item: any) => self.attachIncludes(item, collection, args.include));
        }
        return res;
      },
      async create(args: any) {
        self.reloadIfModified();
        const list = (self.data as any)[collection] || [];
        if (args.data?.idempotencyKey) {
          const duplicate = list.find((i: any) => i.idempotencyKey === args.data.idempotencyKey);
          if (duplicate) {
            const error: any = new Error(`Unique constraint failed on the fields: (idempotency_key)`);
            error.code = 'P2002';
            throw error;
          }
        }
        const item = {
          id: args.data.id || uuidv4(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...args.data,
        };
        list.push(item);
        (self.data as any)[collection] = list;
        self.save();
        return item;
      },
      async update(args: any) {
        self.reloadIfModified();
        const list = (self.data as any)[collection] || [];
        const where = args.where || {};
        const idx = list.findIndex((item: any) => self.matchWhere(item, where));
        if (idx === -1) {
          // If record doesn't exist yet, create it gracefully
          const created = {
            id: where.id || uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date(),
            ...args.data,
          };
          list.push(created);
          (self.data as any)[collection] = list;
          self.save();
          return created;
        }
        const updated = {
          ...list[idx],
          ...args.data,
          updatedAt: new Date(),
        };
        list[idx] = updated;
        (self.data as any)[collection] = list;
        self.save();
        return updated;
      },
      async updateMany(args: any = {}) {
        self.reloadIfModified();
        const list = (self.data as any)[collection] || [];
        const where = args.where || {};
        let count = 0;
        for (let i = 0; i < list.length; i++) {
          if (self.matchWhere(list[i], where)) {
            list[i] = {
              ...list[i],
              ...args.data,
              updatedAt: new Date(),
            };
            count++;
          }
        }
        (self.data as any)[collection] = list;
        self.save();
        return { count };
      },
      async delete(args: any) {
        self.reloadIfModified();
        const list = (self.data as any)[collection] || [];
        const where = args.where || {};
        const idx = list.findIndex((item: any) => self.matchWhere(item, where));
        if (idx === -1) {
          return null;
        }
        const deleted = list.splice(idx, 1)[0];
        (self.data as any)[collection] = list;
        self.save();
        return deleted;
      },
      async deleteMany(args: any = {}) {
        self.reloadIfModified();
        const list = (self.data as any)[collection] || [];
        const where = args.where || {};
        const remaining = list.filter((item: any) => !self.matchWhere(item, where));
        const count = list.length - remaining.length;
        (self.data as any)[collection] = remaining;
        self.save();
        return { count };
      },
      async count(args: any = {}) {
        self.reloadIfModified();
        const list = (self.data as any)[collection] || [];
        const where = args.where || {};
        return list.filter((item: any) => self.matchWhere(item, where)).length;
      },
    };
  }

  private matchWhere(item: any, where: any): boolean {
    if (!where || Object.keys(where).length === 0) return true;
    for (const key of Object.keys(where)) {
      const val = where[key];
      if (val === undefined) continue;

      if (key === 'OR' && Array.isArray(val)) {
        if (!val.some((sub) => this.matchWhere(item, sub))) return false;
        continue;
      }

      if (key === 'AND' && Array.isArray(val)) {
        if (!val.every((sub) => this.matchWhere(item, sub))) return false;
        continue;
      }

      if (key === 'incidentTeams') {
        const itemTeams = (this.data.incidentTeams || []).filter((it: any) => it.incidentId === item.id);
        if (val.some) {
          const match = itemTeams.some((it: any) => {
            if (val.some.teamId?.in && !val.some.teamId.in.includes(it.teamId)) return false;
            if (val.some.revokedAt === null && it.revokedAt) return false;
            return true;
          });
          if (!match) return false;
          continue;
        }
      }

      if (key === 'assignedTeam') {
        const itemTeams = (this.data.incidentTeams || []).filter((it: any) => it.incidentId === item.id);
        if (val.id?.in) {
          const match = itemTeams.some((it: any) => val.id.in.includes(it.teamId));
          if (!match) return false;
          continue;
        }
      }

      if (key === 'responderProfile') {
        const rp = (this.data.responderProfiles || []).find((p: any) => p.memberId === item.id);
        const duty = rp?.dutyState || 'AVAILABLE';
        if (val.dutyState?.in && !val.dutyState.in.includes(duty)) return false;
        continue;
      }

      let itemVal = item[key];
      if (itemVal === undefined) {
        if (key === 'recipientUserId') itemVal = item['recipientId'];
        else if (key === 'recipientId') itemVal = item['recipientUserId'];
      }

      if (typeof val === 'object' && val !== null) {
        if ('in' in val && Array.isArray(val.in)) {
          if (!val.in.includes(itemVal)) return false;
        } else if ('notIn' in val && Array.isArray(val.notIn)) {
          if (val.notIn.includes(itemVal)) return false;
        } else if ('not' in val) {
          if (itemVal === val.not) return false;
        } else if ('contains' in val) {
          const strVal = String(itemVal || '').toLowerCase();
          if (!strVal.includes(String(val.contains).toLowerCase())) return false;
        } else if ('gte' in val) {
          if (itemVal < val.gte) return false;
        } else if ('lte' in val) {
          if (itemVal > val.lte) return false;
        } else {
          if (JSON.stringify(itemVal) !== JSON.stringify(val)) return false;
        }
      } else {
        if (itemVal !== val) return false;
      }
    }
    return true;
  }

  private applyOrderBy(list: any[], orderBy: any): any[] {
    const copy = [...list];
    const key = Object.keys(orderBy)[0];
    const dir = orderBy[key];
    copy.sort((a, b) => {
      if (a[key] < b[key]) return dir === 'desc' ? 1 : -1;
      if (a[key] > b[key]) return dir === 'desc' ? -1 : 1;
      return 0;
    });
    return copy;
  }
}
