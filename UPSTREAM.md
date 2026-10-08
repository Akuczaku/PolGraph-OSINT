# Upstream

This fork is based on **OSInt Graph** by Andrea Cumini.

- Repository: https://github.com/tingon11/OsintGraph
- Upstream website: https://www.osintinfo.net
- Upstream author: Andrea Cumini
- Base release used by this fork: `1.0.0`

## Sync policy

When bringing upstream changes into this fork:

1. preserve `LICENSE`, `NOTICE` and `THIRD-PARTY-NOTICES.md`;
2. keep the original author attribution visible;
3. do not restore the upstream name/logo as the distributed fork branding;
4. re-run the Polish i18n audit;
5. verify that Polish manual and optional Polish OSINT profile still work;
6. never merge local `data/`, `fonti/`, secrets or case material.

Suggested remotes:

```bash
git remote -v
git remote add upstream https://github.com/tingon11/OsintGraph.git
git fetch upstream
```
