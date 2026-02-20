🎯 Apa itu Git Pre-commit Hook?

  Git hook adalah script otomatis yang dijalankan Git pada event tertentu. Pre-commit hook khususnya adalah script yang berjalan 
  SEBELUM commit terjadi.

  📊 Analogi Sederhana

  Bayangkan seperti security check di bandara:

  1. Anda mau naik pesawat (commit code)
  2. Sebelum boarding, ada pemeriksaan otomatis (pre-commit hook)
  3. Jika ada masalah → ditolak, harus perbaiki dulu
  4. Jika OK → lanjut boarding (commit berhasil)

  🔄 Cara Kerja Pre-commit Hook

  ┌─────────────────────────────────────────────────┐
  │ 1. Anda ketik: git commit -m "message"          │
  └─────────────────────┬───────────────────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────────────────┐
  │ 2. Git menjalankan .git/hooks/pre-commit        │
  │    (script otomatis yang Anda set)              │
  └─────────────────────┬───────────────────────────┘
                        │
                        ▼
  ┌─────────────────────────────────────────────────┐
  │ 3. Script cek/perbaiki file                     │
  │    - Reformat .beads/issues.jsonl ✓             │
  │    - Run linter/prettier ✓                      │
  │    - Check type errors ✓                        │
  └─────────────────────┬───────────────────────────┘
                        │
           ┌────────────┴────────────┐
           ▼                         ▼
  ┌─────────────────┐      ┌──────────────────┐
  │ Script GAGAL    │      │ Script BERHASIL  │
  │ (exit code ≠ 0) │      │ (exit code = 0)  │
  └────────┬────────┘      └────────┬─────────┘
           │                        │
           ▼                        ▼
  ┌─────────────────┐      ┌──────────────────┐
  │ ❌ COMMIT DITOLAK│      │ ✅ COMMIT JALAN  │
  │ Tampil error    │      │ File ter-commit  │
  └─────────────────┘      └──────────────────┘

  💡 Contoh Kasus untuk .beads/issues.jsonl

  Tanpa Pre-commit Hook:

  $ bd create --title="New task"     # Buat issue baru
  ✓ Created issue: sm-xyz

  $ cat .beads/issues.jsonl
  # Format: description di depan (susah dibaca) 😢

  $ # Harus manual reformat
  $ # Atau commit apa adanya...

  $ git commit -m "Add new task"
  # Commit dengan format jelek

  Dengan Pre-commit Hook:

  $ bd create --title="New task"     # Buat issue baru
  ✓ Created issue: sm-xyz

  $ cat .beads/issues.jsonl
  # Format: description di depan (masih jelek)

  $ git commit -m "Add new task"

  # 🎉 HOOK BERJALAN OTOMATIS:
  # - Detect .beads/issues.jsonl berubah
  # - Reformat: pindahkan description ke belakang
  # - Stage ulang file yang sudah diformat

  ✓ Commit berhasil dengan format rapi! 🎊

  📂 Lokasi Hook

  Git hooks disimpan di:
  .git/hooks/
  ├── pre-commit          ← Hook yang berjalan sebelum commit
  ├── pre-push           ← Hook sebelum push
  ├── commit-msg         ← Hook untuk validasi commit message
  └── post-commit        ← Hook setelah commit

  🛠️ Contoh Pre-commit Hook untuk Beads

  #!/bin/bash
  # File: .git/hooks/pre-commit

  # Cek apakah .beads/issues.jsonl berubah
  if git diff --cached --name-only | grep -q "^.beads/issues.jsonl$"; then
    echo "🔧 Reformatting .beads/issues.jsonl..."

    # Reformat: pindahkan description ke belakang
    node scripts/format-beads.js

    # Stage ulang file yang sudah diformat
    git add .beads/issues.jsonl

    echo "✅ Format fixed!"
  fi

  # Lanjutkan commit
  exit 0

  ✨ Keuntungan Pre-commit Hook

  1. Otomatis - Tidak perlu ingat-ingat untuk reformat
  2. Konsisten - Format selalu sama setiap commit
  3. Transparan - Berjalan di background, tidak ganggu workflow
  4. Local - Berjalan di komputer Anda, tidak butuh CI/CD
  5. Preventif - Cegah format jelek masuk ke git history

  ⚠️ Kekurangan

  1. Local only - Hook tidak ter-commit ke repo (.git/ di-gitignore)
  2. Setup manual - Setiap developer harus setup sendiri
  3. Bisa di-skip - Bisa bypass dengan git commit --no-verify

  Solusi untuk Kekurangan:

  Gunakan Husky (tool populer untuk manage git hooks):
  - Husky menyimpan hook config di package.json
  - Hook ter-commit ke repo
  - Auto-install saat npm install
  - Semua developer dapat hook yang sama

  🎯 Untuk Kasus Anda

  Saya bisa buatkan 2 opsi:

  Opsi 1: Manual Setup (Simple)

  # File: .git/hooks/pre-commit (Anda buat manual)
  #!/bin/bash
  # Script reformat .beads/issues.jsonl
  - ✅ Cepat, tidak perlu dependency
  - ❌ Setiap clone baru harus setup ulang

  Opsi 2: Husky + NPM Script (Recommended)

  // package.json
  {
    "scripts": {
      "format:beads": "node scripts/format-beads.js"
    },
    "husky": {
      "hooks": {
        "pre-commit": "npm run format:beads && git add .beads/issues.jsonl"
      }
    }
  }
  - ✅ Auto-install untuk semua developer
  - ✅ Ter-commit ke repo
  - ❌ Butuh install Husky