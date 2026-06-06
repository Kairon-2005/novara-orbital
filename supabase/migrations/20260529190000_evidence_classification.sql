-- Store the extracted text and AI classification JSON alongside each uploaded
-- document, so the AI assistant and the assessment can read structured evidence.
-- Idempotent — safe to re-run.

alter table student_documents add column if not exists extracted_text text;
alter table student_documents add column if not exists classification jsonb;
