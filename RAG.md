# Portfolio chat

VEGA retrieves relevant passages locally, then tries Gemini followed by Groq.
If neither provider produces an answer, it displays source excerpts without an AI
call. This last mode is retrieval-only, not generated text.

## Setup

Keep your existing `GEMINI_API_KEY` in `.env.local`. Create a Groq API key at
https://console.groq.com/keys and add `GROQ_API_KEY` to `.env.local` and your
deployment environment. Restart the dev server or redeploy after changing keys.
Do not paste keys into chat or prefix them with `NEXT_PUBLIC_`.

The default fallback is `openai/gpt-oss-20b`. Groq currently lists this model on
its free plan, with quotas: https://console.groq.com/docs/rate-limits.
Free access is not unlimited; account/model availability may change.
Override models with `GEMINI_MODEL` and `GROQ_MODEL`.

## Knowledge sources

- `app/data/profile.ts`: profile, work history, projects, skills, contacts.
- `app/data/sections.ts`: additional public portfolio content.
- `public/resume.tex`: editable resume source, indexed into
  `app/data/resume-index.json` by `npm run rag:index`.

Indexing runs before `npm run dev` and `npm run build`. After editing the resume
while the server is already running, run `npm run rag:index`. The PDF alone is
not ingested; keep the editable source current when replacing the PDF. The
generated JSON is bundled, so production needs no filesystem reads or database.

Retrieval uses BM25 keyword ranking with topic aliases and recent user turns for
follow-up questions. It selects up to six passages within 9,000 characters.
No paid embeddings, vector database, or LangChain dependency is required for
this small corpus. Keyword retrieval can miss paraphrases or non-English queries;
semantic retrieval would be a future improvement if the corpus grows.

Both models receive the same passages and grounding instructions. Prior chat
messages are conversation context, not trusted facts. Source links show retrieved
reference passages, not guaranteed claim-by-claim citations. Each provider has a
10-second timeout and no automatic retries. Failures and empty/truncated replies
advance to the next provider. Logs omit raw provider errors and credentials.


Run `node scripts/test-rag.mjs` for retrieval, route validation, and mocked
provider failover checks. Real Groq responses require a configured account key.
