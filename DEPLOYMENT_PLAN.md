# Plan de Despliegue — App-Gastos en Azure

> **Estado:** Borrador para revisión  
> **Objetivo:** Desplegar la aplicación en Azure con Docker y CI/CD automatizado  
> **Presupuesto estimado:** ~$34/mes (dentro del crédito de $100)

---

## 1. Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────────┐
│                         GITHUB                                  │
│  Repositorio App-Gastos                                         │
│  push a main ──→ GitHub Actions CI/CD                           │
└──────────────────┬──────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ▼                     ▼
┌───────────────┐    ┌────────────────────┐
│ Build Backend │    │  Build Frontend    │
│ Docker image  │    │  (npm run build    │
│               │    │  con VITE_API_URL) │
└───────┬───────┘    └────────┬───────────┘
        │                     │
        ▼                     ▼
┌───────────────┐    ┌────────────────────────────┐
│ Azure         │    │ Azure Static Web Apps      │
│ Container     │    │ (FREE)                     │
│ Registry      │    │ gastos-app.azurestaticapps │
│ (Basic ~$5/m) │    │ .net                       │
└───────┬───────┘    └────────────────────────────┘
        │                     ▲
        ▼                     │ VITE_API_URL apunta a ↓
┌───────────────────────────────────────────────────┐
│ Azure App Service (B1 Linux) ~$13/mes             │
│ gastos-backend.azurewebsites.net                  │
│ [contenedor Docker: gastos-backend:latest]        │
└───────────────────────┬───────────────────────────┘
                        │ Conexión SSL PostgreSQL
                        ▼
┌───────────────────────────────────────────────────┐
│ Azure Database for PostgreSQL Flexible Server     │
│ (Burstable B1ms) ~$16/mes                         │
│ gastos-db.postgres.database.azure.com             │
└───────────────────────────────────────────────────┘
```

**Servicios Azure utilizados:**

| Servicio | Tier | Costo estimado/mes |
|---|---|---|
| Azure Container Registry | Basic | ~$5 |
| Azure App Service | B1 Linux (1 vCPU, 1.75 GB RAM) | ~$13 |
| Azure Database for PostgreSQL Flexible Server | Burstable B1ms + 32 GB storage | ~$16 |
| Azure Static Web Apps | Free | $0 |
| **Total estimado** | | **~$34/mes** |

> Con $100 de crédito tenés aproximadamente **2.5 meses** de operación continua.

---

## 2. Prerrequisitos

Antes de comenzar, asegurate de tener instalado y configurado:

- [ ] **Azure CLI** — [Descargar](https://docs.microsoft.com/cli/azure/install-azure-cli)  
  Verificar: `az --version`
- [ ] **Docker Desktop** — Ya debería estar instalado (tenés Dockerfiles)  
  Verificar: `docker --version`
- [ ] **Git** y cuenta en **GitHub** con el repositorio de la app subido
- [ ] Cuenta Azure con el crédito de $100 activado
- [ ] Node.js 20+ (para pruebas locales)

---

## 3. Fase 1: Preparar el Código

Estos cambios son necesarios antes de desplegar. **Hacer commit y push a GitHub después.**

### 3.1 — Agregar soporte SSL en `backend/db.js`

Azure Database for PostgreSQL requiere conexión SSL. Modificar `backend/db.js`:

```javascript
// db.js — Pool de conexión a PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.PGHOST     || 'localhost',
  port:     process.env.PGPORT     || 5432,
  user:     process.env.PGUSER     || 'gastos_user',
  password: process.env.PGPASSWORD || 'gastos_pass',
  database: process.env.PGDATABASE || 'gastos_db',
  // SSL requerido por Azure PostgreSQL en producción
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
  } else {
    console.log('✅ Conectado a PostgreSQL');
    release();
  }
});

module.exports = pool;
```

### 3.2 — Crear el archivo `.github/workflows/deploy-backend.yml`

Crear la carpeta `.github/workflows/` y el archivo:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'

env:
  ACR_NAME: ${{ secrets.ACR_NAME }}
  IMAGE_NAME: gastos-backend

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Login a Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Login a Azure Container Registry
        run: az acr login --name ${{ secrets.ACR_NAME }}

      - name: Build y push imagen Docker
        run: |
          docker build -t ${{ secrets.ACR_LOGIN_SERVER }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
                       -t ${{ secrets.ACR_LOGIN_SERVER }}/${{ env.IMAGE_NAME }}:latest \
                       ./backend
          docker push ${{ secrets.ACR_LOGIN_SERVER }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          docker push ${{ secrets.ACR_LOGIN_SERVER }}/${{ env.IMAGE_NAME }}:latest

      - name: Deploy a Azure App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: ${{ secrets.AZURE_WEBAPP_NAME }}
          images: ${{ secrets.ACR_LOGIN_SERVER }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

### 3.3 — Crear el archivo `.github/workflows/deploy-frontend.yml`

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    name: Build y Deploy Frontend

    steps:
      - name: Checkout código
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Build Frontend
        working-directory: ./frontend
        run: |
          npm install
          npm run build
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}

      - name: Deploy a Azure Static Web Apps
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "frontend"
          output_location: "dist"
          skip_app_build: true
```

### 3.4 — Commit y push

```bash
git add backend/db.js .github/workflows/
git commit -m "feat: add Azure deployment workflows and SSL support for PostgreSQL"
git push origin main
```

---

## 4. Fase 2: Crear la Infraestructura en Azure

Ejecutar estos comandos **una sola vez** para crear todos los recursos.

### 4.1 — Variables de entorno para los comandos

Copiar y pegar este bloque completo en tu terminal. Todos los nombres ya están definidos:

```bash
RESOURCE_GROUP="rg-gastos-prod"
LOCATION="eastus"
ACR_NAME="gastosprodacr"
PG_SERVER="gastos-pg-prod"
PG_ADMIN="gastosadmin"
PG_PASSWORD="G4st0s#Prod2024!"
PG_DATABASE="gastos_db"
APP_SERVICE_PLAN="asp-gastos-linux"
WEBAPP_NAME="gastos-backend-svc"
SWA_NAME="gastos-frontend-swa"
JWT_SECRET="j8Kx2mNpQ5vRwY9zAcFhLtBuDeGiJoMs"
```

> **Guardá estos valores** (especialmente `PG_PASSWORD` y `JWT_SECRET`), los necesitarás en varios pasos.

### 4.2 — Login a Azure y crear Resource Group

```bash
az login

az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### 4.3 — Crear Azure Container Registry

```bash
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true

# Guardar las credenciales (las necesitarás para los secrets de GitHub)
az acr credential show --name $ACR_NAME
# Anota: loginServer, username y password
```

### 4.4 — Crear Azure Database for PostgreSQL Flexible Server

```bash
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $PG_SERVER \
  --location $LOCATION \
  --admin-user $PG_ADMIN \
  --admin-password $PG_PASSWORD \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --version 16 \
  --storage-size 32 \
  --yes

# Crear la base de datos
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $PG_SERVER \
  --database-name $PG_DATABASE

# Permitir que los servicios Azure se conecten (habilita conexiones desde App Service)
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $PG_SERVER \
  --rule-name AllowAllAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 4.5 — Inicializar el esquema de la base de datos

```bash
# Habilitar tu IP actual para poder correr init.sql desde tu máquina
MY_IP=$(curl -s https://api.ipify.org)

az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $PG_SERVER \
  --rule-name AllowMyIP \
  --start-ip-address $MY_IP \
  --end-ip-address $MY_IP

# Correr el script de inicialización
psql "host=$PG_SERVER.postgres.database.azure.com \
      port=5432 \
      dbname=$PG_DATABASE \
      user=$PG_ADMIN \
      password=$PG_PASSWORD \
      sslmode=require" \
  -f backend/init.sql

# Verificar que las tablas se crearon
psql "host=$PG_SERVER.postgres.database.azure.com \
      port=5432 \
      dbname=$PG_DATABASE \
      user=$PG_ADMIN \
      password=$PG_PASSWORD \
      sslmode=require" \
  -c "\dt"
# Deberías ver: users y gastos
```

### 4.6 — Crear Azure App Service y Web App (backend)

```bash
# Plan de App Service (B1 Linux)
az appservice plan create \
  --resource-group $RESOURCE_GROUP \
  --name $APP_SERVICE_PLAN \
  --is-linux \
  --sku B1

# Web App configurada para usar contenedor Docker desde ACR
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)

az webapp create \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --name $WEBAPP_NAME \
  --deployment-container-image-name $ACR_LOGIN_SERVER/gastos-backend:latest

# Configurar variables de entorno del backend en App Service
az webapp config appsettings set \
  --resource-group $RESOURCE_GROUP \
  --name $WEBAPP_NAME \
  --settings \
    PORT=3001 \
    WEBSITES_PORT=3001 \
    PGHOST="$PG_SERVER.postgres.database.azure.com" \
    PGPORT=5432 \
    PGUSER=$PG_ADMIN \
    PGPASSWORD=$PG_PASSWORD \
    PGDATABASE=$PG_DATABASE \
    PGSSL=true \
    JWT_SECRET=$JWT_SECRET \
    NODE_ENV=production

# Configurar credenciales de ACR para que App Service pueda hacer pull de la imagen
ACR_USERNAME=$(az acr credential show --name $ACR_NAME --query username -o tsv)
ACR_PASSWORD=$(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv)

az webapp config container set \
  --resource-group $RESOURCE_GROUP \
  --name $WEBAPP_NAME \
  --docker-registry-server-url "https://$ACR_LOGIN_SERVER" \
  --docker-registry-server-user $ACR_USERNAME \
  --docker-registry-server-password $ACR_PASSWORD

# Habilitar logs de contenedor (útil para debugging)
az webapp log config \
  --resource-group $RESOURCE_GROUP \
  --name $WEBAPP_NAME \
  --docker-container-logging filesystem
```

### 4.7 — Crear Azure Static Web Apps (frontend)

```bash
# Crear SWA conectado al repositorio de GitHub
# Reemplazá <TU_USUARIO_GITHUB> y <TU_REPO> con tus datos reales
az staticwebapp create \
  --resource-group $RESOURCE_GROUP \
  --name $SWA_NAME \
  --source "https://github.com/<TU_USUARIO_GITHUB>/App-Gastos" \
  --branch main \
  --app-location "frontend" \
  --output-location "dist" \
  --login-with-github

# Obtener el token de deployment (necesario para GitHub Secrets)
az staticwebapp secrets list \
  --name $SWA_NAME \
  --query "properties.apiKey" -o tsv
# Guardar este token como AZURE_STATIC_WEB_APPS_API_TOKEN en GitHub Secrets
```

---

## 5. Fase 3: Configurar Secrets en GitHub

En tu repositorio de GitHub ir a **Settings → Secrets and variables → Actions → New repository secret** y agregar:

| Secret Name | Valor | Cómo obtenerlo |
|---|---|---|
| `AZURE_CREDENTIALS` | JSON del service principal | Ver paso 5.1 abajo |
| `ACR_NAME` | Ej: `gastosacr` | El nombre que elegiste |
| `ACR_LOGIN_SERVER` | Ej: `gastosacr.azurecr.io` | `az acr show --name $ACR_NAME --query loginServer -o tsv` |
| `AZURE_WEBAPP_NAME` | Ej: `gastos-backend-api` | El nombre que elegiste |
| `VITE_API_URL` | Ej: `https://gastos-backend-api.azurewebsites.net` | La URL de tu App Service |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Token SWA | Obtenido en el paso 4.7 |

### 5.1 — Crear Service Principal para GitHub Actions

```bash
# Obtener el ID de la suscripción
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

# Crear el service principal con permisos de Contributor en el resource group
az ad sp create-for-rbac \
  --name "github-actions-gastos" \
  --role contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth
```

El comando devuelve un JSON. Copiar **todo el JSON** (incluyendo las llaves `{}`) como valor del secret `AZURE_CREDENTIALS`.

```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "...",
  "tenantId": "...",
  ...
}
```

### 5.2 — Agregar permisos para hacer push a ACR

```bash
# El service principal también necesita permisos sobre ACR
ACR_RESOURCE_ID=$(az acr show --name $ACR_NAME --query id -o tsv)
SP_APP_ID=$(az ad sp list --display-name "github-actions-gastos" --query "[0].appId" -o tsv)

az role assignment create \
  --assignee $SP_APP_ID \
  --role AcrPush \
  --scope $ACR_RESOURCE_ID
```

---

## 6. Fase 4: Primer Despliegue Manual (Validación)

Antes de que el CI/CD tome el control, hacer un primer deploy manual para verificar que todo funciona.

### 6.1 — Build y push imagen del backend

```bash
# Login a ACR
az acr login --name $ACR_NAME

# Build de la imagen
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer -o tsv)

docker build -t $ACR_LOGIN_SERVER/gastos-backend:latest ./backend

# Push a ACR
docker push $ACR_LOGIN_SERVER/gastos-backend:latest

# Forzar restart de App Service para que tome la nueva imagen
az webapp restart --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME
```

### 6.2 — Verificar que el backend está operativo

```bash
# Esperar ~1-2 minutos y luego probar el health check
curl https://$WEBAPP_NAME.azurewebsites.net/
# Respuesta esperada: {"status":"ok","message":"API de Control de Gastos ✅"}

# Probar el endpoint de registro
curl -X POST https://$WEBAPP_NAME.azurewebsites.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Test User","email":"test@test.com","password":"123456"}'
# Respuesta esperada: {"token":"...","user":{...}}
```

### 6.3 — Verificar logs si hay problemas

```bash
# Ver logs en tiempo real del contenedor
az webapp log tail \
  --resource-group $RESOURCE_GROUP \
  --name $WEBAPP_NAME
```

### 6.4 — Primer deploy del frontend

Una vez verificado el backend, hacer push al repositorio. El workflow de GitHub Actions se encargará del frontend. Si querés hacerlo manualmente:

```bash
cd frontend
VITE_API_URL=https://$WEBAPP_NAME.azurewebsites.net npm run build

# Instalar SWA CLI si no lo tenés
npm install -g @azure/static-web-apps-cli

# Deploy manual
swa deploy ./dist \
  --deployment-token $(az staticwebapp secrets list --name $SWA_NAME --query "properties.apiKey" -o tsv)
```

---

## 7. Fase 5: Verificación End-to-End

Con ambos servicios desplegados, probar el flujo completo:

1. **Abrir el frontend**: `https://<SWA_NAME>.azurestaticapps.net`
2. **Registro**: Crear una cuenta nueva
3. **Login**: Iniciar sesión con la cuenta creada
4. **Dashboard**: Verificar que carga sin errores
5. **Crear gasto**: Agregar un gasto y verificar que aparece en la lista
6. **Historial**: Verificar que el filtro por mes funciona
7. **Eliminar gasto**: Verificar que la eliminación funciona
8. **Logout y re-login**: Verificar persistencia de datos

### Verificar base de datos directamente

```bash
psql "host=$PG_SERVER.postgres.database.azure.com \
      port=5432 \
      dbname=$PG_DATABASE \
      user=$PG_ADMIN \
      password=$PG_PASSWORD \
      sslmode=require" \
  -c "SELECT * FROM users; SELECT * FROM gastos;"
```

---

## 8. Flujo CI/CD — Cómo Funciona Después del Setup

Una vez configurado, cada `git push` a `main` activa automáticamente:

```
git push origin main
        │
        ├── Si hay cambios en backend/ → deploy-backend.yml
        │     1. Build Docker image (backend)
        │     2. Push a ACR con tag :sha y :latest
        │     3. Deploy a App Service (zero-downtime swap)
        │
        └── Si hay cambios en frontend/ → deploy-frontend.yml
              1. npm install + npm run build (con VITE_API_URL)
              2. Deploy a Azure Static Web Apps (CDN global)
```

---

## 9. Resumen de URLs Finales

| Servicio | URL |
|---|---|
| Frontend | `https://<SWA_NAME>.azurestaticapps.net` |
| Backend API | `https://<WEBAPP_NAME>.azurewebsites.net` |
| Health check | `https://<WEBAPP_NAME>.azurewebsites.net/` |
| PostgreSQL | `<PG_SERVER>.postgres.database.azure.com:5432` |
| ACR | `<ACR_NAME>.azurecr.io` |

---

## 10. Comandos de Mantenimiento

```bash
# Ver estado de todos los recursos
az resource list --resource-group $RESOURCE_GROUP --output table

# Reiniciar backend
az webapp restart --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME

# Ver logs del backend en tiempo real
az webapp log tail --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME

# Escalar App Service (si necesitás más recursos)
az appservice plan update --resource-group $RESOURCE_GROUP --name $APP_SERVICE_PLAN --sku B2

# Apagar App Service para ahorrar crédito (cuando no lo usés)
az webapp stop --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME
az webapp start --resource-group $RESOURCE_GROUP --name $WEBAPP_NAME

# Eliminar TODO (al final del semestre para no gastar crédito)
az group delete --name $RESOURCE_GROUP --yes --no-wait
```

---

## 11. Nombres y URLs Definitivos

| Variable | Valor | URL pública |
|---|---|---|
| `ACR_NAME` | `gastosprodacr` | `gastosprodacr.azurecr.io` |
| `PG_SERVER` | `gastos-pg-prod` | `gastos-pg-prod.postgres.database.azure.com` |
| `WEBAPP_NAME` | `gastos-backend-svc` | `https://gastos-backend-svc.azurewebsites.net` |
| `SWA_NAME` | `gastos-frontend-swa` | `https://gastos-frontend-swa.azurestaticapps.net` |
| `RESOURCE_GROUP` | `rg-gastos-prod` | — |

> Si algún nombre ya está tomado en Azure (error "already exists"), agregar un sufijo numérico corto, ej: `gastosprodacr2`.

---

## Checklist de Progreso

- [ ] Fase 1: Cambios en el código (`db.js` + workflows) — commit y push
- [ ] Fase 2: Crear recursos Azure (ACR, PostgreSQL, App Service, SWA)
- [ ] Fase 2.5: Inicializar esquema SQL en Azure PostgreSQL
- [ ] Fase 3: Configurar los 6 secrets en GitHub
- [ ] Fase 4: Primer deploy manual y verificación del backend
- [ ] Fase 5: Verificación end-to-end del flujo completo
- [ ] Primer push automático via CI/CD funciona correctamente
