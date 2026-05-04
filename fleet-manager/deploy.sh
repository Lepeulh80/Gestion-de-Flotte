#!/bin/bash
# ============================================================
# SCRIPT DE DÉPLOIEMENT - Fleet Manager sur Hostinger VPS
# Usage: bash deploy.sh
# ============================================================
set -e

APP_DIR="/var/www/fleet-manager"
BACKEND_DIR="$APP_DIR/backend"
LOG_DIR="/var/log/fleet-manager"

echo "🚛 Déploiement Fleet Manager NC Mali..."

# 1. Créer les dossiers
echo "📁 Création des dossiers..."
mkdir -p "$APP_DIR" "$LOG_DIR"

# 2. Copier les fichiers
echo "📋 Copie des fichiers..."
cp -r . "$APP_DIR/"

# 3. Installer les dépendances
echo "📦 Installation des dépendances..."
cd "$BACKEND_DIR"
npm install --production

# 4. Vérifier .env
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "⚠️  ATTENTION: Créez le fichier .env avant de continuer!"
    echo "   cp $BACKEND_DIR/.env.example $BACKEND_DIR/.env"
    echo "   nano $BACKEND_DIR/.env"
    exit 1
fi

# 5. Démarrer avec PM2
echo "🚀 Démarrage avec PM2..."
pm2 delete fleet-manager 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo "✅ Déploiement terminé!"
echo "   App: http://localhost:3001"
echo "   Logs: pm2 logs fleet-manager"
echo "   Status: pm2 status"
