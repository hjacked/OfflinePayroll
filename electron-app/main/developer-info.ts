import { app } from 'electron';

export interface DeveloperInformation {
  application_name: string;
  application_version: string;
  developer_name: string;
  support_email: string;
  support_phone: string;
  website: string;
  copyright_notice: string;
  build_date: string;
}

const DEVELOPER_NAME = 'Your Company Name';
const SUPPORT_EMAIL = 'support@example.com';
const SUPPORT_PHONE = '';
const WEBSITE = 'https://example.com';
const BUILD_DATE = '2026-07-11';

export function getDeveloperInformation(): DeveloperInformation {
  const applicationName = app.getName() || 'Offline Payroll Management System';
  return {
    application_name: applicationName,
    application_version: app.getVersion(),
    developer_name: DEVELOPER_NAME,
    support_email: SUPPORT_EMAIL,
    support_phone: SUPPORT_PHONE,
    website: WEBSITE,
    copyright_notice: `© ${new Date().getFullYear()} ${DEVELOPER_NAME}. All rights reserved.`,
    build_date: BUILD_DATE,
  };
}
