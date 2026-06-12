# Plan de Despliegue — App-Gastos en Azure

> **Repositorio:** https://github.com/albertoamas/app-gastos
> **Suscripción Azure:** Azure for Students (`dffcc809-c0d1-4eb2-bf73-850636482a19`)
> **Fecha:** Junio 2026

---

## ¿Por qué esta arquitectura?

La aplicación tiene tres servicios: frontend (React), backend (Node.js) y base de datos (PostgreSQL). Cada uno tiene su propio `Dockerfile`, lo que significa que se puede empaquetar como imagen Docker y desplegar en la nube de forma independiente.

En vez de usar servicios separados para cada capa (y pagar por cada uno), usamos **Azure Container Apps**: un servicio de Azure que corre contenedores Docker directamente, con un tier gratuito generoso. Así todo el despliegue es 100% basado en Docker, coherente con el `docker-compose.yml` que ya existe para desarrollo local.

---

## Arquitectura final

```
┌──────────────────────────────────────────────────────────────────┐
│  Desarrollador hace: git push origin main                        │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  GitHub Actions CI/CD (automático)                               │
│                                                                  │
│  deploy-backend.yml          deploy-frontend.yml                 │
│  ┌─────────────────────┐     ┌──────────────────────────────┐    │
│  │ 1. docker build     │     │ 1. docker build              │    │
│  │    backend/         │     │    frontend/ con             │    │
│  │ 2. docker push ACR  │     │    VITE_API_URL              │    │
│  │ 3. az containerapp  │     │ 2. docker push ACR           │    │
│  │    update           │     │ 3. az containerapp update    │    │
│  └─────────────────────┘     └──────────────────────────────┘    │
└──────────────────────────────┬───────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  Azure Container Registry (gastosprodacr.azurecr.io)             │
│  Almacena las imágenes Docker                                     │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐  │
│  │ gastos-backend:v1.0  │  │ gastos-frontend:v1.0            │  │
│  └──────────────────────┘  └──────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────┘
                               │ pull images
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│  Azure Container Apps Environment (gastos-env)                   │
│  Red privada compartida entre los contenedores                   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ gastos-frontend (nginx + React build)                   │     │
│  │ Puerto 80 → HTTPS público                               │     │
│  │ URL: https://gastos-frontend.<id>.eastus.azurecontainer │     │
│  │ apps.io                                                 │     │
│  └─────────────────────────────────────────────────────────┘     │
│                         │ llama a la API                         │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │ gastos-backend (Node.js Express)                        │     │
│  │ Puerto 3001 → HTTPS público                             │     │
│  │ URL: https://gastos-backend.<id>.eastus.azurecontainer  │     │
│  │ apps.io                                                 │     │
│  └─────────────────────────────────────────────────────────┘     │
│                         │ conexión SSL PostgreSQL                │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│  Azure Database for PostgreSQL Flexible Server                   │
│  (gastos-pg-brs — región: Brazil South)                          │
│  gastos-pg-brs.postgres.database.azure.com:5432                  │
│  Base de datos: gastos_db                                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## ¿Qué hace cada pieza?

| Servicio | Qué es | Para qué sirve |
|---|---|---|
| **Azure Container Registry (ACR)** | Repositorio privado de imágenes Docker | Guarda las imágenes del backend y frontend que construye GitHub Actions |
| **Azure Container Apps** | Servicio para correr contenedores en la nube | Ejecuta el backend y el frontend como contenedores Docker |
| **Azure PostgreSQL Flexible Server** | Base de datos administrada | Almacena los usuarios y gastos. Azure gestiona backups y actualizaciones |
| **GitHub Actions** | CI/CD automatizado | Detecta cambios en el código, construye las imágenes y las despliega en Azure |

---

## Costos estimados

| Servicio | Tier | $/mes |
|---|---|---|
| Azure Container Registry | Basic | ~$5 |
| Azure Container Apps | Free tier (uso bajo) | ~$0-3 |
| Azure PostgreSQL Flexible Server | Burstable B1ms (Brazil South) | ~$16 |
| **Total** | | **~$21-24/mes** |

Con $100 de crédito: aproximadamente **4 meses** de operación.

---

## Nombres de recursos (ya definidos)

| Recurso | Nombre | Endpoint |
|---|---|---|
| Resource Group | `rg-gastos-prod` | — |
| Container Registry | `gastosprodacr` | `gastosprodacr.azurecr.io` |
| PostgreSQL Server | `gastos-pg-brs` | `gastos-pg-brs.postgres.database.azure.com` |
| PostgreSQL Admin | `gastosadmin` | — |
| PostgreSQL Password | `G4st0s#Prod2024!` | — |
| PostgreSQL Database | `gastos_db` | — |
| Container Apps Environment | `gastos-env` | — |
| Backend Container App | `gastos-backend` | `https://gastos-backend.<id>.eastus.azurecontainerapps.io` |
| Frontend Container App | `gastos-frontend` | `https://gastos-frontend.<id>.eastus.azurecontainerapps.io` |
| JWT Secret | `j8Kx2mNpQ5vRwY9zAcFhLtBuDeGiJoMs` | — |

---

## FASE 0 — Instalar herramientas

### Paso 0.1 — Instalar Azure CLI

Abrir **PowerShell como Administrador** y ejecutar:

```powershell
winget install --id Microsoft.AzureCLI --silent --accept-package-agreements --accept-source-agreements
```

Esperar a que termine (descarga ~63 MB). Al finalizar debe decir `Instalado correctamente`.

**Cerrar la terminal y abrir una nueva.** Verificar:

```powershell
az --version
```

Debe mostrar `azure-cli 2.x.x` o superior.

---

### Paso 0.2 — Instalar Docker Desktop

Docker construye las imágenes de los contenedores que se subirán a Azure.

1. Descargar desde: https://www.docker.com/products/docker-desktop/
2. Instalar y reiniciar si lo pide
3. Abrir Docker Desktop y esperar el ícono verde de la ballena

Verificar:
```powershell
docker --version
```

---

### Paso 0.3 — Instalar cliente PostgreSQL (psql)

Se usa una sola vez para ejecutar el script que crea las tablas en la base de datos.

```powershell
winget install --id PostgreSQL.PostgreSQL.16 --silent --accept-package-agreements --accept-source-agreements
```

Cerrar y abrir terminal nueva. Verificar:
```powershell
psql --version
```

---

### Paso 0.4 — Clonar el repositorio

```powershell
git clone https://github.com/albertoamas/app-gastos.git
cd app-gastos
```

---

## FASE 1 — Login en Azure

### Paso 1.1 — Iniciar sesión

```powershell
az login
```

Se abre el navegador. Iniciar sesión con la cuenta Azure que tiene los créditos. Al volver a la terminal, aparece la lista de suscripciones. Presionar **Enter** para confirmar la default.

Verificar que quedó activa:
```powershell
az account show --query "{Suscripcion:name, Estado:state}" --output table
```

Resultado esperado:
```
Suscripcion         Estado
------------------  --------
Azure for Students  Enabled
```

---

### Paso 1.2 — Registrar proveedores de Azure

La primera vez hay que habilitar los servicios que se van a usar. Ejecutar cada uno y esperar el prompt `PS>`:

```powershell
az provider register --namespace Microsoft.ContainerRegistry --wait
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.DBforPostgreSQL --wait
az provider register --namespace Microsoft.OperationalInsights --wait
```

Verificar que todos quedaron registrados:
```powershell
az provider show --namespace Microsoft.ContainerRegistry --query "registrationState" -o tsv
az provider show --namespace Microsoft.App --query "registrationState" -o tsv
az provider show --namespace Microsoft.DBforPostgreSQL --query "registrationState" -o tsv
az provider show --namespace Microsoft.OperationalInsights --query "registrationState" -o tsv
```

Los cuatro deben responder `Registered`.

---

## FASE 2 — Crear infraestructura en Azure

> Todos los recursos quedan agrupados en `rg-gastos-prod` para poder administrarlos y eliminarlos juntos.

### Paso 2.1 — Resource Group ✅ YA CREADO

El Resource Group es el contenedor lógico de todos los recursos.

```powershell
az group create `
  --name "rg-gastos-prod" `
  --location "eastus" `
  --output table
```

Resultado esperado:
```
Location    Name
----------  --------------
eastus      rg-gastos-prod
```

---

### Paso 2.2 — Azure Container Registry (ACR) ✅ YA CREADO

El ACR es el repositorio privado donde se guardan las imágenes Docker. GitHub Actions las sube aquí y Azure Container Apps las descarga desde aquí.

```powershell
az acr create `
  --resource-group "rg-gastos-prod" `
  --name "gastosprodacr" `
  --sku Basic `
  --admin-enabled true `
  --output table
```

Resultado esperado:
```
NAME           RESOURCE GROUP   LOCATION   SKU    LOGIN SERVER
gastosprodacr  rg-gastos-prod   eastus     Basic  gastosprodacr.azurecr.io
```

Ver las credenciales del ACR (se usan más adelante como GitHub Secrets):
```powershell
az acr credential show --name "gastosprodacr" --output table
```

Guardar el `USERNAME` y el primer `PASSWORD`.

---

### Paso 2.3 — Azure Database for PostgreSQL ✅ YA CREADO

La base de datos administrada corre en la región **Brazil South** (única habilitada para este servicio en la suscripción Azure for Students de la UCB).

> **Nota:** La región del servidor PostgreSQL es diferente a la del resto de recursos. Esto es normal — Azure permite que recursos de un mismo Resource Group estén en distintas regiones. La latencia entre Brazil South y East US es de ~100ms, aceptable para un proyecto universitario.

```powershell
az postgres flexible-server create `
  --resource-group "rg-gastos-prod" `
  --name "gastos-pg-brs" `
  --location "brazilsouth" `
  --admin-user "gastosadmin" `
  --admin-password "G4st0s#Prod2024!" `
  --sku-name "Standard_B1ms" `
  --tier "Burstable" `
  --version "16" `
  --storage-size 32 `
  --yes
```

Este comando tarda ~5 minutos. Al terminar:
```powershell
az postgres flexible-server show `
  --resource-group "rg-gastos-prod" `
  --name "gastos-pg-brs" `
  --query "{Nombre:name, Estado:state, Host:fullyQualifiedDomainName}" `
  --output table
```

Resultado esperado:
```
Nombre         Estado    Host
-------------  --------  -----------------------------------------
gastos-pg-brs  Ready     gastos-pg-brs.postgres.database.azure.com
```

Crear la base de datos dentro del servidor:
```powershell
az postgres flexible-server db create `
  --resource-group "rg-gastos-prod" `
  --server-name "gastos-pg-brs" `
  --name "gastos_db"
```

---

### Paso 2.4 — Configurar firewall de PostgreSQL

Azure PostgreSQL bloquea todas las conexiones por defecto. Hay que abrir dos reglas:

**Regla 1:** Permitir que Azure Container Apps se conecte (IPs internas de Azure):
```powershell
az postgres flexible-server firewall-rule create `
  --resource-group "rg-gastos-prod" `
  --server-name "gastos-pg-brs" `
  --name "AllowAzureServices" `
  --start-ip-address "0.0.0.0" `
  --end-ip-address "0.0.0.0"
```

**Regla 2:** Permitir la IP del equipo actual para poder ejecutar el script de inicialización:
```powershell
$MY_IP = (Invoke-RestMethod -Uri "https://api.ipify.org")
Write-Output "Tu IP publica es: $MY_IP"

az postgres flexible-server firewall-rule create `
  --resource-group "rg-gastos-prod" `
  --server-name "gastos-pg-brs" `
  --name "AllowMyIP" `
  --start-ip-address $MY_IP `
  --end-ip-address $MY_IP
```

---

### Paso 2.5 — Inicializar el esquema de la base de datos

El archivo `backend/init.sql` crea las tablas `users` y `gastos`. Se ejecuta una sola vez:

```powershell
cd app-gastos

psql "host=gastos-pg-brs.postgres.database.azure.com port=5432 dbname=gastos_db user=gastosadmin password=G4st0s#Prod2024! sslmode=require" -f backend/init.sql
```

Resultado esperado:
```
CREATE TABLE
CREATE TABLE
```

Verificar que las tablas se crearon:
```powershell
psql "host=gastos-pg-brs.postgres.database.azure.com port=5432 dbname=gastos_db user=gastosadmin password=G4st0s#Prod2024! sslmode=require" -c "\dt"
```

Resultado esperado:
```
        List of relations
 Schema | Name   | Type  |    Owner
--------+--------+-------+--------------
 public | gastos | table | gastosadmin
 public | users  | table | gastosadmin
```

---

### Paso 2.6 — Container Apps Environment

El Environment es la red virtual compartida donde van a correr todos los contenedores. Es como la red `gastos_net` del `docker-compose.yml` local.

```powershell
az containerapp env create `
  --name "gastos-env" `
  --resource-group "rg-gastos-prod" `
  --location "eastus" `
  --output table
```

Este comando tarda ~2 minutos. Resultado esperado:
```
Name        Location    ResourceGroup    ProvisioningState
----------  ----------  ---------------  -------------------
gastos-env  East US     rg-gastos-prod   Succeeded
```

---

### Paso 2.7 — Build y push de imágenes Docker al ACR

Antes de crear los Container Apps, las imágenes tienen que existir en el ACR.

Login al ACR:
```powershell
az acr login --name "gastosprodacr"
```

**Build y push del backend:**
```powershell
docker build -t "gastosprodacr.azurecr.io/gastos-backend:latest" ./backend
docker push "gastosprodacr.azurecr.io/gastos-backend:latest"
```

**Build y push del frontend** (con la URL del backend que vendrá del Paso 2.8):

> Este paso se completa DESPUÉS de crear el backend Container App en el Paso 2.8, cuando ya tenemos la URL real del backend.

---

### Paso 2.8 — Backend Container App

Crea el contenedor del backend usando la imagen recién subida al ACR:

```powershell
$ACR_PASSWORD = az acr credential show --name "gastosprodacr" --query "passwords[0].value" -o tsv

az containerapp create `
  --name "gastos-backend" `
  --resource-group "rg-gastos-prod" `
  --environment "gastos-env" `
  --image "gastosprodacr.azurecr.io/gastos-backend:latest" `
  --registry-server "gastosprodacr.azurecr.io" `
  --registry-username "gastosprodacr" `
  --registry-password $ACR_PASSWORD `
  --target-port 3001 `
  --ingress external `
  --min-replicas 1 `
  --max-replicas 1 `
  --env-vars `
    "PORT=3001" `
    "PGHOST=gastos-pg-brs.postgres.database.azure.com" `
    "PGPORT=5432" `
    "PGUSER=gastosadmin" `
    "PGPASSWORD=G4st0s#Prod2024!" `
    "PGDATABASE=gastos_db" `
    "PGSSL=true" `
    "JWT_SECRET=j8Kx2mNpQ5vRwY9zAcFhLtBuDeGiJoMs" `
    "NODE_ENV=production" `
  --output table
```

Obtener la URL del backend (la necesitamos para construir el frontend):
```powershell
$BACKEND_URL = az containerapp show `
  --name "gastos-backend" `
  --resource-group "rg-gastos-prod" `
  --query "properties.configuration.ingress.fqdn" -o tsv

Write-Output "URL del backend: https://$BACKEND_URL"
```

**Guardar esta URL** — la necesitás en el siguiente paso y como GitHub Secret.

Verificar que el backend responde:
```powershell
Invoke-RestMethod -Uri "https://$BACKEND_URL/"
```

Resultado esperado:
```
status message
------ --------------------------------
ok     API de Control de Gastos ✅
```

---

### Paso 2.9 — Frontend Container App

Ahora que tenemos la URL del backend, construimos la imagen del frontend con esa URL "horneada" en el build:

```powershell
# Usar la variable $BACKEND_URL del paso anterior
docker build `
  --build-arg VITE_API_URL="https://$BACKEND_URL" `
  -t "gastosprodacr.azurecr.io/gastos-frontend:latest" `
  ./frontend

docker push "gastosprodacr.azurecr.io/gastos-frontend:latest"
```

Crear el Container App del frontend:
```powershell
az containerapp create `
  --name "gastos-frontend" `
  --resource-group "rg-gastos-prod" `
  --environment "gastos-env" `
  --image "gastosprodacr.azurecr.io/gastos-frontend:latest" `
  --registry-server "gastosprodacr.azurecr.io" `
  --registry-username "gastosprodacr" `
  --registry-password $ACR_PASSWORD `
  --target-port 80 `
  --ingress external `
  --min-replicas 1 `
  --max-replicas 1 `
  --output table
```

Obtener la URL del frontend:
```powershell
$FRONTEND_URL = az containerapp show `
  --name "gastos-frontend" `
  --resource-group "rg-gastos-prod" `
  --query "properties.configuration.ingress.fqdn" -o tsv

Write-Output "URL del frontend: https://$FRONTEND_URL"
```

---

## FASE 3 — Configurar Secrets en GitHub

Los secrets son variables privadas que GitHub Actions usa para autenticarse en Azure y construir las imágenes sin exponer contraseñas en el código.

Ir a: **https://github.com/albertoamas/app-gastos/settings/secrets/actions**

Hacer clic en **New repository secret** y agregar cada uno:

| Nombre del Secret | Valor | Para qué se usa |
|---|---|---|
| `AZURE_CREDENTIALS` | JSON del service principal (Paso 3.1) | Autenticar GitHub Actions en Azure |
| `ACR_NAME` | `gastosprodacr` | Login al Container Registry |
| `ACR_LOGIN_SERVER` | `gastosprodacr.azurecr.io` | Prefijo de las imágenes Docker |
| `VITE_API_URL` | `https://gastos-backend.<id>.eastus.azurecontainerapps.io` | URL del backend para el build del frontend |

---

### Paso 3.1 — Crear Service Principal

El Service Principal es una identidad de Azure que GitHub Actions usa para hacer deployments de forma segura sin necesitar una contraseña de usuario real.

```powershell
az ad sp create-for-rbac `
  --name "github-actions-gastos" `
  --role contributor `
  --scopes /subscriptions/dffcc809-c0d1-4eb2-bf73-850636482a19/resourceGroups/rg-gastos-prod `
  --sdk-auth
```

El comando devuelve un JSON. Copiar **todo el bloque** (incluyendo `{` y `}`) como valor del secret `AZURE_CREDENTIALS`:
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "dffcc809-c0d1-4eb2-bf73-850636482a19",
  "tenantId": "...",
  ...
}
```

Dar permisos al Service Principal para hacer push al ACR:
```powershell
$SP_ID = az ad sp list --display-name "github-actions-gastos" --query "[0].appId" -o tsv
$ACR_ID = az acr show --name "gastosprodacr" --query "id" -o tsv

az role assignment create `
  --assignee $SP_ID `
  --role AcrPush `
  --scope $ACR_ID
```

También necesita permisos para actualizar Container Apps:
```powershell
az role assignment create `
  --assignee $SP_ID `
  --role "Contributor" `
  --scope /subscriptions/dffcc809-c0d1-4eb2-bf73-850636482a19/resourceGroups/rg-gastos-prod
```

---

## FASE 4 — CI/CD con GitHub Actions

Los workflows ya están en el repositorio en `.github/workflows/`. Se activan automáticamente en cada `git push`.

### Cómo funciona `deploy-backend.yml`

Se activa cuando hay cambios en `backend/`:
1. Hace login en Azure con el Service Principal
2. Hace login al ACR
3. Construye la imagen Docker del backend con el tag del commit (`${{ github.sha }}`)
4. Sube la imagen al ACR con dos tags: el del commit y `latest`
5. Actualiza el Container App `gastos-backend` para usar la nueva imagen

### Cómo funciona `deploy-frontend.yml`

Se activa cuando hay cambios en `frontend/`:
1. Hace login en Azure
2. Hace login al ACR
3. Construye la imagen Docker del frontend, pasando `VITE_API_URL` como build argument
4. Sube la imagen al ACR
5. Actualiza el Container App `gastos-frontend`

> La URL del backend (`VITE_API_URL`) está guardada como GitHub Secret para que el workflow la use al construir la imagen.

---

## FASE 5 — Verificación end-to-end

Abrir el frontend en el navegador con la URL obtenida en el Paso 2.9.

Flujo completo a probar:
1. Registrar una cuenta nueva (email + contraseña)
2. Iniciar sesión
3. Agregar un gasto con monto, descripción y fecha → debe aparecer en el dashboard
4. Ir a Historial → verificar que aparece en la tabla
5. Filtrar por mes → verificar que el filtro funciona
6. Eliminar el gasto → verificar que desaparece
7. Cerrar sesión y volver a iniciar → los datos deben persistir

---

## Cómo hacer un redeploy (flujo normal de trabajo)

Cada vez que se modifica código y se hace push, GitHub Actions despliega automáticamente:

```powershell
# Modificar algún archivo del backend o frontend
git add .
git commit -m "descripcion del cambio"
git push origin main
```

Ir a https://github.com/albertoamas/app-gastos/actions para ver el progreso. Tarda ~3 minutos.

---

## Comandos de mantenimiento

```powershell
# Ver todos los recursos del proyecto
az resource list --resource-group "rg-gastos-prod" --output table

# Ver logs del backend en tiempo real
az containerapp logs show `
  --name "gastos-backend" `
  --resource-group "rg-gastos-prod" `
  --follow

# Reiniciar el backend
az containerapp revision restart `
  --name "gastos-backend" `
  --resource-group "rg-gastos-prod" `
  --revision $(az containerapp revision list --name "gastos-backend" --resource-group "rg-gastos-prod" --query "[0].name" -o tsv)

# Ver estado de los Container Apps
az containerapp list `
  --resource-group "rg-gastos-prod" `
  --output table

# Eliminar TODOS los recursos al final del semestre (libera crédito)
az group delete --name "rg-gastos-prod" --yes --no-wait
```

---

## Checklist de progreso

- [x] Fase 0 — Herramientas instaladas (Azure CLI, Docker, psql)
- [x] Paso 1.1 — Login en Azure
- [x] Paso 1.2 — Proveedores registrados (ContainerRegistry, App, DBforPostgreSQL, OperationalInsights)
- [x] Paso 2.1 — Resource Group creado (`rg-gastos-prod` en eastus)
- [x] Paso 2.2 — ACR creado (`gastosprodacr`)
- [x] Paso 2.3 — PostgreSQL creado (`gastos-pg-brs` en brazilsouth, estado: Ready)
- [x] Paso 2.3b — Base de datos `gastos_db` creada
- [ ] Paso 2.4 — Firewall de PostgreSQL configurado
- [ ] Paso 2.5 — Schema SQL inicializado (tablas users y gastos)
- [ ] Paso 2.6 — Container Apps Environment creado (`gastos-env`)
- [ ] Paso 2.7 — Imagen del backend subida al ACR
- [ ] Paso 2.8 — Backend Container App creado y funcionando
- [ ] Paso 2.9 — Imagen del frontend subida al ACR y frontend Container App creado
- [ ] Paso 3.1 — Service Principal creado con permisos
- [ ] Paso 3.2 — 4 secrets configurados en GitHub
- [ ] Fase 5 — Verificación end-to-end completa
