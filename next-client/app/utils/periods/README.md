# utils/periods

Calendar periods behind the `{{weekSheet}}`, `{{monthSheet}}`, `{{quarterSheet}}` and `{{yearSheet}}` template tokens. Pure: no React, no file access.

| File | Purpose |
|------|---------|
| `period.ts` | `Period` (`kind`, `name`, `start` / `end` local midnights). `weekPeriod(date, offset?)` (ISO week, Monday to Sunday, named by the ISO week-year: `2026-W53` runs Dec 28 2026 to Jan 3 2027), `monthPeriod(date, offset?)`, `quarterPeriod(date, offset?)` (`2026-Q4`, Q1 = January to March), `yearPeriod(date, offset?)` (`2026-year`: a bare `2026` is too likely an ordinary note), `periodOf(kind, date, offset?)`, `isoWeekOf`. Local-date arithmetic only, so DST never shifts a day. |
