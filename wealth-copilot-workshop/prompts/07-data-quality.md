# Add data quality checks

```text
Add a reusable data-quality validation step to the synthetic Wealth Copilot
data pipeline. Check required fields, IDs, referential integrity, dates,
amounts, currencies and duplicate records.

The command should fail clearly with actionable errors and should not rewrite
valid data with an empty output. Add tests for both valid data and at least
three invalid cases. Keep it dependency-light and document how a production
data-quality platform would extend it.
```
