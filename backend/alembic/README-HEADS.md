If Alembic reports multiple heads:

- Inspect heads:
  alembic heads

- Create a merge migration (if needed):
  alembic merge -m "merge heads" <head1> <head2>

This repo includes merge migrations for past divergences (e.g., 20250828_2110 and 20250902_1300).
