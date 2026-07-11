# Offline Payroll Licensing Setup

## Before distributing the application

1. Edit `electron-app/main/developer-info.ts` with your company and support details.
2. Generate your production Ed25519 key pair:

```powershell
cd D:\Projects\OfflinePayroll\developer-tools\license-generator
npm run keys:generate
```

3. Store `.keys/private-key.pem` in a secure offline location. Never include it in Git, the installer, backups sent to customers, or the renderer source.
4. Rebuild and restart the payroll application after changing the key pair.

## Trial behavior

A fresh installation starts a 30-day local trial with a five-active-employee limit. Trial payslips carry a `TRIAL VERSION` watermark. When the trial expires or trial clock rollback is detected, existing data remains viewable and backups remain available, but write operations are blocked until a valid signed license is activated.

## Generate a full license

Open **Settings → License** in the customer installation and copy the Installation ID. Then run:

```powershell
cd D:\Projects\OfflinePayroll\developer-tools\license-generator
npm run license:create -- --customer "ABC Trading" --edition full_perpetual --installation-id "OFFPAY-XXXX-XXXX-XXXX-XXXX"
```

For a subscription:

```powershell
npm run license:create -- --customer "ABC Trading" --edition full_subscription --days 365 --installation-id "OFFPAY-XXXX-XXXX-XXXX-XXXX"
```

For a signed trial:

```powershell
npm run license:create -- --customer "ABC Trading" --edition trial --days 30 --installation-id "OFFPAY-XXXX-XXXX-XXXX-XXXX"
```

The generated `.license` file can be imported from **Settings → License → Activate license file**.

## Practical security limits

Offline licensing raises the effort required for unauthorized copying but cannot be made completely tamper-proof. Keep the private key secure, sign release builds, restrict developer tools, and retain customer/license issuance records.
