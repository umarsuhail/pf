# ATS Resume Studio

Independent Next.js app inside the `pf` repository. It edits `.tex` resumes, compiles them with **pdflatex**, previews/downloads searchable PDFs, and supports photo/image assets without rasterizing the resume text.

## Run from pf root

```bash
npm install
npm run dev:ats
```

ATS Studio runs on http://localhost:3010 while the portfolio remains on its existing port.

## System dependencies

The compile API requires `pdflatex` (TeX Live) and `pdftotext` (Poppler). The included Dockerfile installs both.

## ATS note

The checks verify concrete PDF/source properties and keyword coverage. They do not claim to reproduce or bypass a private employer ATS.
