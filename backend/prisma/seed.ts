import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Users ─────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 12);
  const staffHash = await bcrypt.hash('staff123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@unifyit.com' },
    update: {},
    create: {
      email: 'admin@unifyit.com', passwordHash: adminHash,
      firstName: 'Alex', lastName: 'Admin', role: 'ADMIN',
      department: 'IT', jobTitle: 'IT Director', mfaEnabled: true,
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'tech@unifyit.com' },
    update: {},
    create: {
      email: 'tech@unifyit.com', passwordHash: staffHash,
      firstName: 'Sam', lastName: 'Technician', role: 'IT_STAFF',
      department: 'IT', jobTitle: 'Systems Administrator', mfaEnabled: true,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@unifyit.com' },
    update: {},
    create: {
      email: 'manager@unifyit.com', passwordHash: staffHash,
      firstName: 'Morgan', lastName: 'Manager', role: 'MANAGER',
      department: 'Engineering', jobTitle: 'Engineering Manager', mfaEnabled: false,
    },
  });

  await prisma.user.upsert({
    where: { email: 'viewer@unifyit.com' },
    update: {},
    create: {
      email: 'viewer@unifyit.com', passwordHash: staffHash,
      firstName: 'Val', lastName: 'Viewer', role: 'READ_ONLY',
      department: 'Marketing', jobTitle: 'Marketing Coordinator', mfaEnabled: false,
    },
  });

  // ─── SaaS Applications ────────────────────────────────────
  const saasApps = [
    { name: 'Slack', vendor: 'Salesforce', owner: 'IT', category: 'Communication', licenseCount: 200, activeUsers: 185, monthlyCost: 2400, annualCost: 28800, utilizationPct: 92.5, status: 'ACTIVE' as const, ssoEnabled: true },
    { name: 'Jira', vendor: 'Atlassian', owner: 'Engineering', category: 'Project Management', licenseCount: 150, activeUsers: 120, monthlyCost: 1500, annualCost: 18000, utilizationPct: 80, status: 'ACTIVE' as const, ssoEnabled: true },
    { name: 'Salesforce', vendor: 'Salesforce', owner: 'Sales', category: 'CRM', licenseCount: 100, activeUsers: 78, monthlyCost: 7500, annualCost: 90000, utilizationPct: 78, status: 'ACTIVE' as const, ssoEnabled: true },
    { name: 'Figma', vendor: 'Figma', owner: 'Design', category: 'Design', licenseCount: 30, activeUsers: 22, monthlyCost: 450, annualCost: 5400, utilizationPct: 73, status: 'ACTIVE' as const, ssoEnabled: false },
    { name: 'Notion', vendor: 'Notion', owner: 'Product', category: 'Documentation', licenseCount: 200, activeUsers: 45, monthlyCost: 2000, annualCost: 24000, utilizationPct: 22.5, status: 'ACTIVE' as const, ssoEnabled: false },
    { name: 'Zoom', vendor: 'Zoom', owner: 'IT', category: 'Communication', licenseCount: 100, activeUsers: 95, monthlyCost: 2000, annualCost: 24000, utilizationPct: 95, status: 'ACTIVE' as const, ssoEnabled: true },
    { name: 'Canva', vendor: 'Canva', owner: 'Unknown', category: 'Design', licenseCount: 10, activeUsers: 3, monthlyCost: 130, annualCost: 1560, utilizationPct: 30, status: 'SHADOW_IT' as const, isShadowIT: true, ssoEnabled: false },
    { name: 'Monday.com', vendor: 'Monday', owner: 'Unknown', category: 'Project Management', licenseCount: 15, activeUsers: 2, monthlyCost: 300, annualCost: 3600, utilizationPct: 13, status: 'SHADOW_IT' as const, isShadowIT: true, ssoEnabled: false },
  ];

  for (const app of saasApps) {
    await prisma.saaSApplication.upsert({
      where: { id: app.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-seed' },
      update: app,
      create: { id: app.name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-seed', ...app },
    });
  }

  // ─── Assets ────────────────────────────────────────────────
  const assets = [
    { name: 'MacBook Pro 16"', assetTag: 'AST-001', type: 'LAPTOP' as const, manufacturer: 'Apple', model: 'MacBook Pro 16" M3 Max', serialNumber: 'FVFXM2XXXXX', assignedUserId: admin.id, department: 'IT', purchaseDate: new Date('2024-06-15'), purchaseCost: 3499, warrantyExpiry: new Date('2027-06-15'), osName: 'macOS', osVersion: '15.1', patchStatus: 'Up to date', status: 'IN_USE' as const },
    { name: 'ThinkPad X1 Carbon', assetTag: 'AST-002', type: 'LAPTOP' as const, manufacturer: 'Lenovo', model: 'X1 Carbon Gen 11', serialNumber: 'PF4XXXXX', assignedUserId: staff.id, department: 'IT', purchaseDate: new Date('2024-03-01'), purchaseCost: 1849, warrantyExpiry: new Date('2027-03-01'), osName: 'Windows', osVersion: '11 Pro', patchStatus: 'Up to date', status: 'IN_USE' as const },
    { name: 'Dell PowerEdge R750', assetTag: 'AST-003', type: 'SERVER' as const, manufacturer: 'Dell', model: 'PowerEdge R750', serialNumber: 'DELLSRV001', department: 'IT', purchaseDate: new Date('2023-01-15'), purchaseCost: 12500, warrantyExpiry: new Date('2026-01-15'), osName: 'Ubuntu', osVersion: '22.04 LTS', patchStatus: 'Needs update', status: 'IN_USE' as const },
    { name: 'iPhone 15 Pro', assetTag: 'AST-004', type: 'MOBILE' as const, manufacturer: 'Apple', model: 'iPhone 15 Pro', serialNumber: 'APLMOB001', assignedUserId: manager.id, department: 'Engineering', purchaseDate: new Date('2024-09-20'), purchaseCost: 1199, warrantyExpiry: new Date('2026-09-20'), osName: 'iOS', osVersion: '18.1', patchStatus: 'Up to date', status: 'IN_USE' as const },
    { name: 'Dell OptiPlex 7010', assetTag: 'AST-005', type: 'DESKTOP' as const, manufacturer: 'Dell', model: 'OptiPlex 7010', serialNumber: 'DELLDT001', department: 'Finance', purchaseDate: new Date('2021-06-01'), purchaseCost: 1200, warrantyExpiry: new Date('2024-06-01'), osName: 'Windows', osVersion: '11 Pro', patchStatus: 'Outdated', status: 'IN_USE' as const },
  ];

  for (const asset of assets) {
    await prisma.asset.upsert({
      where: { assetTag: asset.assetTag },
      update: {},
      create: asset,
    });
  }

  // ─── Security Alerts ───────────────────────────────────────
  const alerts = [
    { title: 'Suspicious login from unusual location', source: 'Okta', severity: 'HIGH' as const, status: 'OPEN' as const, description: 'Login detected from IP 185.x.x.x (Russia) for user john@company.com' },
    { title: 'SSL certificate expiring in 7 days', source: 'Certificate Monitor', severity: 'MEDIUM' as const, status: 'OPEN' as const, description: 'Certificate for api.company.com expires on 2026-02-26', affectedAsset: 'api.company.com' },
    { title: 'Critical CVE detected on production server', source: 'Vulnerability Scanner', severity: 'CRITICAL' as const, status: 'IN_PROGRESS' as const, description: 'CVE-2025-1234: Remote code execution in OpenSSL 3.1.x', affectedAsset: 'prod-web-01' },
    { title: 'Failed login brute force attempt', source: 'Firewall', severity: 'HIGH' as const, status: 'OPEN' as const, description: '150 failed login attempts from IP 103.x.x.x in 5 minutes' },
    { title: 'Unencrypted data transfer detected', source: 'DLP', severity: 'MEDIUM' as const, status: 'OPEN' as const, description: 'Sensitive data transferred via HTTP instead of HTTPS' },
  ];

  for (const alert of alerts) {
    await prisma.securityAlert.create({ data: alert });
  }

  // ─── Compliance Frameworks ─────────────────────────────────
  const frameworks = [
    { name: 'SOC 2 Type II', totalControls: 64, passedControls: 52, failedControls: 4, progressPct: 81.25 },
    { name: 'ISO 27001', totalControls: 114, passedControls: 89, failedControls: 10, progressPct: 78.07 },
    { name: 'NIST CSF', totalControls: 108, passedControls: 75, failedControls: 15, progressPct: 69.44 },
    { name: 'GDPR', totalControls: 45, passedControls: 40, failedControls: 2, progressPct: 88.89 },
  ];

  for (const fw of frameworks) {
    await prisma.complianceFramework.create({ data: fw });
  }

  // ─── Servers ───────────────────────────────────────────────
  const servers = [
    { hostname: 'prod-web-01', ipAddress: '10.0.1.10', type: 'Web Server', os: 'Ubuntu 22.04', cpuCores: 8, ramGB: 32, diskGB: 500, cpuUsagePct: 45, ramUsagePct: 68, diskUsagePct: 42, environment: 'Production', status: 'ONLINE' as const },
    { hostname: 'prod-db-01', ipAddress: '10.0.1.20', type: 'Database', os: 'Ubuntu 22.04', cpuCores: 16, ramGB: 64, diskGB: 2000, cpuUsagePct: 72, ramUsagePct: 85, diskUsagePct: 65, environment: 'Production', status: 'ONLINE' as const },
    { hostname: 'prod-api-01', ipAddress: '10.0.1.30', type: 'API Server', os: 'Ubuntu 22.04', cpuCores: 8, ramGB: 16, diskGB: 200, cpuUsagePct: 35, ramUsagePct: 55, diskUsagePct: 30, environment: 'Production', status: 'ONLINE' as const },
    { hostname: 'staging-web-01', ipAddress: '10.0.2.10', type: 'Web Server', os: 'Ubuntu 22.04', cpuCores: 4, ramGB: 8, diskGB: 100, cpuUsagePct: 15, ramUsagePct: 40, diskUsagePct: 25, environment: 'Staging', status: 'ONLINE' as const },
    { hostname: 'aws-worker-01', ipAddress: '172.31.1.50', type: 'Worker', os: 'Amazon Linux 2', cpuCores: 4, ramGB: 16, diskGB: 100, cpuUsagePct: 88, ramUsagePct: 72, diskUsagePct: 45, environment: 'Production', cloudProvider: 'AWS', region: 'us-east-1', status: 'ONLINE' as const },
    { hostname: 'legacy-dc-01', ipAddress: '192.168.1.100', type: 'Domain Controller', os: 'Windows Server 2019', cpuCores: 4, ramGB: 16, diskGB: 500, cpuUsagePct: 25, ramUsagePct: 55, diskUsagePct: 70, environment: 'Production', adSynced: true, status: 'ONLINE' as const },
  ];

  for (const srv of servers) {
    await prisma.server.upsert({
      where: { hostname: srv.hostname },
      update: {},
      create: srv,
    });
  }

  // ─── Network Devices ───────────────────────────────────────
  const networkDevices = [
    { name: 'Core Switch 01', type: 'SWITCH' as const, manufacturer: 'Cisco', model: 'Catalyst 9300', ipAddress: '10.0.0.1', location: 'Main Office - MDF', isOnline: true, uptimePct: 99.99 },
    { name: 'Edge Firewall', type: 'FIREWALL' as const, manufacturer: 'Palo Alto', model: 'PA-3260', ipAddress: '10.0.0.2', location: 'Main Office - MDF', isOnline: true, uptimePct: 99.95 },
    { name: 'Office AP Floor 1', type: 'ACCESS_POINT' as const, manufacturer: 'Ubiquiti', model: 'U6 Pro', ipAddress: '10.0.0.50', location: 'Main Office - Floor 1', isOnline: true, uptimePct: 98.5 },
    { name: 'Office AP Floor 2', type: 'ACCESS_POINT' as const, manufacturer: 'Ubiquiti', model: 'U6 Pro', ipAddress: '10.0.0.51', location: 'Main Office - Floor 2', isOnline: false, uptimePct: 45.0 },
    { name: 'VPN Gateway', type: 'VPN_GATEWAY' as const, manufacturer: 'Cisco', model: 'ASA 5525-X', ipAddress: '10.0.0.3', location: 'Main Office - MDF', isOnline: true, uptimePct: 99.8 },
  ];

  for (const device of networkDevices) {
    await prisma.networkDevice.create({ data: device });
  }

  // ─── Tickets ───────────────────────────────────────────────
  const tickets = [
    { title: 'Cannot connect to VPN', description: 'Getting "connection timed out" when trying to connect from home', category: 'Network', priority: 'HIGH' as const, status: 'OPEN' as const, creatorId: manager.id },
    { title: 'Need access to Salesforce', description: 'Starting on the sales team next week and need CRM access', category: 'Access Request', priority: 'MEDIUM' as const, status: 'IN_PROGRESS' as const, creatorId: manager.id, assigneeId: staff.id },
    { title: 'Laptop running slow', description: 'My laptop takes 5 minutes to boot and apps freeze frequently', category: 'Hardware', priority: 'LOW' as const, status: 'OPEN' as const, creatorId: manager.id },
    { title: 'Email not syncing on phone', description: 'Outlook on my iPhone stopped syncing yesterday', category: 'Email', priority: 'MEDIUM' as const, status: 'RESOLVED' as const, creatorId: manager.id, assigneeId: staff.id, resolvedAt: new Date() },
  ];

  for (const ticket of tickets) {
    await prisma.ticket.create({ data: ticket });
  }

  // ─── Workflows ─────────────────────────────────────────────
  const workflows = [
    { name: 'New Employee Onboarding', description: 'Automatically provision accounts, assign hardware, and send welcome email', triggerType: 'event', triggerConfig: '{"event":"user.created"}', actions: '["create_email","provision_slack","provision_jira","assign_laptop","send_welcome"]', isActive: true, isBuiltIn: true, runCount: 47, hoursSaved: 94, costRecovered: 4700 },
    { name: 'Employee Offboarding', description: 'Deactivate accounts, reclaim licenses, collect hardware', triggerType: 'event', triggerConfig: '{"event":"user.deactivated"}', actions: '["deactivate_email","revoke_saas","reclaim_licenses","create_asset_return_ticket"]', isActive: true, isBuiltIn: true, runCount: 12, hoursSaved: 36, costRecovered: 1800 },
    { name: 'License Reclamation', description: 'Detect and reclaim unused SaaS licenses', triggerType: 'schedule', triggerConfig: '{"cron":"0 9 * * 1"}', conditions: '{"utilizationBelow":10,"inactiveDays":30}', actions: '["flag_license","notify_owner","reclaim_if_no_response"]', isActive: true, isBuiltIn: true, runCount: 52, hoursSaved: 26, costRecovered: 15600 },
    { name: 'MFA Enrollment Nudge', description: 'Remind users without MFA to enable it', triggerType: 'schedule', triggerConfig: '{"cron":"0 10 * * 3"}', conditions: '{"mfaEnabled":false}', actions: '["send_mfa_reminder","escalate_after_3_reminders"]', isActive: true, isBuiltIn: true, runCount: 24, hoursSaved: 12, costRecovered: 0 },
    { name: 'Patch Alert Notification', description: 'Alert IT staff when critical patches are available', triggerType: 'event', triggerConfig: '{"event":"vulnerability.critical"}', actions: '["notify_it_staff","create_ticket","add_to_patch_queue"]', isActive: true, isBuiltIn: true, runCount: 8, hoursSaved: 4, costRecovered: 0 },
  ];

  for (const wf of workflows) {
    await prisma.workflow.create({ data: wf });
  }

  // ─── Activity Feed ─────────────────────────────────────────
  const activities = [
    { type: 'saas_added', title: 'Added Slack to SaaS inventory', module: 'saas', userId: admin.id },
    { type: 'alert_created', title: 'Critical CVE detected on prod-web-01', module: 'security', userId: admin.id },
    { type: 'ticket_created', title: 'New ticket: Cannot connect to VPN', module: 'helpdesk', userId: manager.id },
    { type: 'workflow_executed', title: 'License Reclamation workflow completed', module: 'automation', userId: admin.id },
    { type: 'asset_added', title: 'Added MacBook Pro 16" to inventory', module: 'assets', userId: staff.id },
    { type: 'user_onboarded', title: 'New user Morgan Manager provisioned', module: 'identity', userId: admin.id },
    { type: 'compliance_updated', title: 'SOC 2 progress updated to 81%', module: 'security', userId: admin.id },
  ];

  for (const activity of activities) {
    await prisma.activityFeed.create({ data: activity });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
