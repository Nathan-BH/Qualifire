# undo-repair.ps1 - puts virgin back exactly where it was before repair-dropped-files.ps1
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath 'C:\Users\natha\Claude personal projects\Qualifire'
$env:GIT_OPTIONAL_LOCKS = '0'
git update-ref refs/heads/virgin backup/before-index-repair
git reset --mixed
git log --oneline -3
