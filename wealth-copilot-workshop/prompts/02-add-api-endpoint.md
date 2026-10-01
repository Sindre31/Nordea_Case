# Add an API endpoint

```text
Add a new TypeScript REST endpoint to this Wealth Copilot API:

GET /customers/:customerId/<endpoint-name>

First inspect the existing route and service conventions. Reuse the existing
data loader and return a 404 for an unknown customer. Keep calculations
deterministic and explainable. Add focused Supertest coverage for:

- a valid customer
- an invalid customer
- the important calculation or aggregation

Also add the new path and response schema to api/src/openapi.yaml so it shows
up correctly in Swagger UI at /docs.

Do not add a database or external API. Run the API tests and type-check when
finished.
```
