# Setup Server — Generus Mandiri (paritas dengan laptop)

> Paste isi blok "PROMPT" di bawah ke sesi `claude` BARU di server (di dalam folder repo).
> Tujuan: server punya kualitas kerja + beads sync + config yang sama dengan laptop.

---

## PROMPT (copy-paste ke Claude Code di server)

```
Saya baru clone repo Generus Mandiri (Next.js 15 + Supabase) ke server ini dan mau setup agar paritas dengan environment laptop saya. Tolong cek + setup hal berikut, JANGAN eksekusi git (saya yang commit/push):

## 1. Beads (issue tracker) — auto-sync

INSTALL DULU kalau `bd` belum ada di server (sumber resmi = github.com/gastownhall/beads, BUKAN @beads/cli atau beads.sh):
```bash
# pilih salah satu:
curl -fsSL https://raw.githubusercontent.com/gastownhall/beads/main/scripts/install.sh | bash   # install script
npm install -g @beads/bd                                                                          # via npm
brew install beads                                                                                # via Linuxbrew
```
VERSI: pakai versi SAMA dengan laptop biar sync aman. Target = 1.0.4 (latest stable). Laptop akan di-upgrade ke 1.0.4 juga (`brew upgrade beads`). Verifikasi `bd version` cocok di kedua mesin sebelum sync.

Beads pakai backend Dolt; sync issue antar mesin lewat file .beads/issues.jsonl yang di-track git. Git hooks WAJIB dipasang ulang di tiap clone (hooks tidak ikut git pull). Jalankan:
- `bd version` (pastikan terinstall + versi cocok laptop)
- `bd doctor` (health check, laporkan error/warning)
- `bd migrate --update-repo-id --yes` (fix fingerprint — clone = repo ID beda)
- `bd hooks install` (pasang pre-commit auto-export + post-merge/checkout auto-import)
- `bd doctor --fix --yes` (untrack credential key + bersihkan artifact)
- `bd import .beads/issues.jsonl` (muat issue terbaru dari file)
- Verifikasi: `bd list` harus menampilkan issue terbaru (mis. sm-jsb closed, sm-69c, sm-ejs, sm-7fw).

Setelah ini, alur sync: laptop commit (auto-export) → push → server `git pull` (auto-import). Otomatis, tanpa manual export.

## 2. MCP Supabase
PENTING: file .mcp.json di-GITIGNORE (tidak ikut repo), jadi server TIDAK punya file ini setelah clone. Saya harus buat/copy manual. Bantu saya buat .mcp.json di root repo server dengan isi: server "generus-mandiri-v2", command npx @supabase/mcp-server-supabase@latest, --project-ref=eahntxowlefjaizjoqys, dan env SUPABASE_ACCESS_TOKEN (saya isi token sendiri dari laptop, JANGAN tampilkan token di output). Setelah dibuat, cek koneksi via `mcp__generus-mandiri-v2__list_tables`.

## 3. Config & Skills user-level (~/.claude/ — TIDAK ikut repo)
Hal berikut ada di ~/.claude/ laptop, tidak ke-clone lewat repo. Saya akan copy manual. Tolong PANDU saya apa saja yang perlu + penyesuaian path:
- ~/.claude/CLAUDE.md (aturan global: model selection, manajemen sesi, tool quirks)
- ~/.claude/skills/ — copy 7 skill relevan: new-feature-workflow, git-commit-message, model-advice, reflect, grow, release, cleanup-sessions
- Plugins (install via `claude plugin install`, BUKAN copy folder): beads, superpowers, caveman, claude-md-management, skill-creator
- Memory: ~/.claude/projects/<PATH-BASED-FOLDER>/memory/ — PENTING: nama folder = path absolut repo. Di laptop: `-Users-abuabdirohman-Documents-Programs-OpenSource-school-management`. Di server path beda, jadi folder harus di-rename sesuai path repo di server ini, kalau tidak memory tidak ter-recall. Bantu saya tentukan nama folder yang benar untuk server (cek `pwd`).
- Hooks/scripts (opsional, kalau pakai RTK): ~/.claude/scripts/, ~/.claude/settings.json

## 4. Project docs (sudah ikut repo — cuma verifikasi)
Pastikan ada: CLAUDE.md, docs/claude/ (16 file), src/types/. Ini sumber kualitas project-level, sudah ter-clone.

Mulai dari #1 (beads), lalu lapor temuan tiap langkah sebelum lanjut.
```

---

## Catatan tambahan (untuk kamu, bukan prompt)

**Yang IKUT repo (otomatis di server):** CLAUDE.md, docs/claude/, .beads/*.jsonl (issue), src/.

**.mcp.json TIDAK ikut repo** (gitignored, aman — token tidak bocor). Server harus buat/copy manual.

**Yang TIDAK ikut (manual copy / install):**
- `~/.claude/CLAUDE.md` global + skills + memory + plugins + hooks
- git hooks beads (`bd hooks install` per clone)

**Paritas versi:** install `bd` versi sama di server. Laptop = 0.61.0 (doctor saran upgrade ke 1.0.4 via `brew upgrade beads`). Server Linux → install bd via rilis Linux (lihat github.com/steveyegge/beads).

**Memory folder rename:** di server jalankan `pwd`, ganti `/` jadi `-`, itu nama folder memory. Contoh server `/home/abu/apps/school-management` → folder `-home-abu-apps-school-management`.

**Token:** `.mcp.json` gitignored (aman, tidak di repo). Server harus copy file ini manual dari laptop (atau bikin baru dgn token Supabase yang sama).
