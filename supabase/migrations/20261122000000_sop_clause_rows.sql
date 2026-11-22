-- One row per SOP clause: uploaded SOP documents are stored clause by clause so Copilot cites the exact clause.
alter table public.sop_documents drop constraint if exists sop_documents_pkey;
alter table public.sop_documents add primary key (doc_code, clause);
