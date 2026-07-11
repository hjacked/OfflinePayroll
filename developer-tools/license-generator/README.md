# Offline Payroll License Generator

This developer-only tool creates Ed25519 signing keys and signed Trial, Full Perpetual, and Full Subscription license files.

## Security rule

Never commit, publish, email broadly, or include `.keys/private-key.pem` in the payroll installer. The payroll application receives only the public key.

## 1. Generate your production key pair

```powershell
cd D:\Projects\OfflinePayroll\developer-tools\license-generator
npm run keys:generate
```

This creates:

- `.keys/private-key.pem` — secret signing key
- `.keys/public-key.pem` — verification key
- updates `electron-app/main/license-public-key.ts`

Restart/rebuild the payroll app after generating a new key pair.

## 2. Create a machine-locked 30-day trial

```powershell
npm run license:create -- --customer "ABC Trading" --edition trial --days 30 --installation-id "OFFPAY-XXXX-XXXX-XXXX-XXXX"
```

## 3. Create a perpetual full license

```powershell
npm run license:create -- --customer "ABC Trading" --edition full_perpetual --installation-id "OFFPAY-XXXX-XXXX-XXXX-XXXX"
```

## 4. Create a one-year subscription

```powershell
npm run license:create -- --customer "ABC Trading" --edition full_subscription --days 365 --installation-id "OFFPAY-XXXX-XXXX-XXXX-XXXX"
```

Optional arguments:

- `--max-employees 50`
- `--features employees,timekeeping,leave,payroll,reports,payslips`
- `--output D:\Licenses\ABC-Trading.license`
- omit `--installation-id` to create an unlocked license

## 5. Verify a license

```powershell
npm run license:verify -- --file .\output\ABC-Trading-full_perpetual.license
```

## Activation

In the payroll application, open **Settings → License**, copy the Installation ID, generate the license, and select **Activate license file**.
