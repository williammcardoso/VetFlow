param(
  [Parameter(Mandatory=$true)]
  [string]$Message
)

# Falha rápido em erro
$ErrorActionPreference = "Stop"

# 1) Verifica se está em repo git
git rev-parse --is-inside-work-tree | Out-Null

# 2) Mostra status antes
Write-Host "`n=== Git status (antes) ===" -ForegroundColor Cyan
git status --short

# 3) Impede commit vazio
$changes = git status --porcelain
if (-not $changes) {
  Write-Host "Sem alterações para commit." -ForegroundColor Yellow
  exit 0
}

# 4) Stage de tudo (ajuste se quiser seletivo)
git add .

# 5) Mostra diff resumido do staged
Write-Host "`n=== Diff staged (resumo) ===" -ForegroundColor Cyan
git diff --cached --stat

# 6) Confirmação humana (camada de segurança)
$confirm = Read-Host "`nConfirmar commit com a mensagem '$Message'? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
  Write-Host "Commit cancelado." -ForegroundColor Yellow
  exit 1
}

# 7) Commit
git commit -m "$Message"

Write-Host "`nCommit concluído com sucesso." -ForegroundColor Green
Write-Host "Dica: push manual depois com 'git push'." -ForegroundColor Gray