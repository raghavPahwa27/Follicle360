# Follicle360
Independent concept inspired by Man Matters. Eight-week demo history is fictional. Product images link to official source listings. Reference progress images have illustrative dates and were edited to remove navigation arrows.

Browser-local data: localStorage / IndexedDB. Normal and demo records remain separate. Existing localhost data is not uploaded or migrated to the hosted origin.

Normal-mode pack checks evaluate the entered expiry locally; no manufacturer verification is claimed. Demo mode offers a clearly labelled fictional batch lookup. The Cloudflare Worker serves /api/verify (mock registry) and /api/coach (Groq). Configure GROQ_API_KEY as a hosted secret and GROQ_MODEL as a runtime variable. No credentials are included in source. The coach uses best-effort per-isolate request throttling, not a guaranteed account-wide budget cap.

Build with the Sites build helper. The original local Node project remains in Documents/Mosaic/follicle360 2.
