
Today 
- Beresin Meeting cretion page
- absensi page 
- optimasi

Absensi
[] Ubah konsep jadi saat masuk ke halaman ini, user perlu tambah pertemuan
[] Jadi saat buka halaman ini, langsung menampilkan pertemuannya ada di hari apa saja dan persentase kehadirannya
[] User bisa edit pertemuan yang sudah berlalu
[] Di dalam absensi jadi tidak perlu biarkan user bisa ganti ganti hari karena harinya sudah fix saat masuk ke table input absensi nya

[x] + button di pojok kanan bawah
[] setelah update isi absensi data di list, card nya tidak langsung terupdate
[x] delete pakai confirm modal

Siswa
[x] Tambah siswa masih sangat lama
[x] Setelah CRUD siswa data di absensi dan laporan tidak langsung terudpate
[x] Berikan filter atau searching di table nya
[x] Buat loading skeleton

Laporan
[] Buat loading skeleton

Components
- Input select with arrow (laporan, modal pertemuan)
- Button & Loading
- Icon sidebar & bottom samain dengan di home

Bug
- Terkadang terkena error berikut
AuthSessionMissingError: Auth session missing!
    at eval (webpack-internal:///(app-pages-browser)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1219:59)
    at SupabaseAuthClient._useSession (webpack-internal:///(app-pages-browser)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1107:26)
    at async SupabaseAuthClient._getUser (webpack-internal:///(app-pages-browser)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1211:20)
    at async eval (webpack-internal:///(app-pages-browser)/./node_modules/@supabase/auth-js/dist/module/GoTrueClient.js:1198:20)
AuthApiError: Invalid Refresh Token: Refresh Token Not Found {
  __isAuthError: true,
  status: 400,
  code: 'refresh_token_not_found'
}
AuthApiError: Invalid Refresh Token: Refresh Token Not Found {
  __isAuthError: true,
  status: 400,
  code: 'refresh_token_not_found'
}
AuthApiError: Invalid Refresh Token: Refresh Token Not Found {
  __isAuthError: true,
  status: 400,
  code: 'refresh_token_not_found'
}
AuthApiError: Invalid Refresh Token: Refresh Token Not Found {
  __isAuthError: true,
  status: 400,
  code: 'refresh_token_not_found'
}
 GET /signin 200 in 95ms
AuthApiError: Invalid Refresh Token: Refresh Token Not Found {
  __isAuthError: true,
  status: 400,
  code: 'refresh_token_not_found'
}
AuthApiError: Invalid Refresh Token: Refresh Token Not Found {
  __isAuthError: true,
  status: 400,
  code: 'refresh_token_not_found'
}
[Error [AuthApiError]: Invalid Refresh Token: Refresh Token Not Found] {
  __isAuthError: true,
  status: 400,
  code: 'refresh_token_not_found'
}
[Error [AuthApiError]: Invalid Refresh Token: Refresh Token Not Found] {
  __isAuthError: true,
  status: 400,
  code: 'refresh_token_not_found'
}
- 
