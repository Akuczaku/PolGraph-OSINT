# Security policy

## Reporting a security problem

Please open a GitHub issue only for non-sensitive technical details.

**Do not attach or paste:**
- real case databases;
- personal data;
- source documents from investigations;
- API keys;
- `chatbot.conf`;
- private URLs, tokens or credentials.

If a minimal reproducer is needed, create synthetic data.

## Local data

The application is designed to keep case data locally. Repository rules ignore
the normal data/source folders and common database/export formats, but users are
still responsible for checking staged files before every commit.
