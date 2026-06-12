# Guía de Despliegue — App-Gastos en Azure

> **Repositorio:** https://github.com/albertoamas/app-gastos
> **Suscripción Azure:** Azure for Students (`dffcc809-c0d1-4eb2-bf73-850636482a19`)
> **Fecha de despliegue inicial:** Junio 2026

---

## ¿Qué es esta guía?

Esta guía explica paso a paso cómo desplegar la aplicación App-Gastos en la nube usando **Azure** y **Docker**. Está pensada para que puedas seguirla copiando y pegando cada comando, entendiendo qué hace cada uno.

Al terminar tendrás:
- La app corriendo en Azure accesible desde cualquier navegador
- Despliegue automático cada vez que hagas un `git push` (CI/CD)
- Base de datos PostgreSQL en la nube con datos persistentes

---

## ¿Por qué esta arquitectura?

La aplicación tiene tres partes: frontend (React), backend (Node.js) y base de datos (PostgreSQL). Cada una tiene su propio `Dockerfile`, lo que significa que se puede empaquetar como contenedor Docker y correr de forma independiente en la nube.

Usamos **Azure Container Apps**: un servicio de Azure que corre contenedores Docker directamente, con un tier gratuito generoso y sin necesidad de administrar servidores.

```
git push
   │
   ▼
GitHub Actions (CI/CD automático)
   │
   ├── Construye imagen Docker del backend
   ├── Construye imagen Docker del frontend (con URL del backend)
   └── Sube ambas imágenes al ACR
              │
              ▼
   Azure Container Registry (gastosprodacr.azurecr.io)
   Repositorio privado de imágenes Docker
              │
              ▼
   Azure Container Apps Environment (gastos-env)
   ┌─────────────────────────────────┐
   │  gastos-frontend (nginx+React)  │ ← puerto 80, HTTPS público
   │  gastos-backend (Node.js)       │ ← puerto 3001, HTTPS público
   └─────────────────────────────────┘
              │
              ▼
   Azure PostgreSQL Flexible Server
   (gastos-pg-brs — Brazil South)
   Datos guardados de forma permanente
```

---

## Costos estimados

| Servicio | Tier | $/mes |
|---|---|---|
| Azure Container Registry | Basic | ~$5 |
| Azure Container Apps | Free tier | ~$0-3 |
| Azure PostgreSQL Flexible Server | Burstable B1ms | ~$16 |
| **Total** | | **~$21-24/mes** |

Con $100 de crédito Azure for Students: aproximadamente **4 meses** de operación.

---

## Recursos creados (nombres definitivos)

| Recurso | Nombre | Endpoint |
|---|---|---|
| Resource Group | `rg-gastos-prod` | — |
| Container Registry | `gastosprodacr` | `gastosprodacr.azurecr.io` |
| PostgreSQL Server | `gastos-pg-brs` | `gastos-pg-brs.postgres.database.azure.com` |
| PostgreSQL Admin | `gastosadmin` | — |
| PostgreSQL Password | `G4st0s#Prod2024!` | — |
| PostgreSQL Base de datos | `gastos_db` | — |
| Container Apps Environment | `gastos-env` | — |
| Backend Container App | `gastos-backend` | https://gastos-backend.proudsmoke-50d3b336.eastus.azurecontainerapps.io |
| Frontend Container App | `gastos-frontend` | https://gastos-frontend.proudsmoke-50d3b336.eastus.azurecontainerapps.io |
| JWT Secret | `j8Kx2mNpQ5vRwY9zAcFhLtBuDeGiJoMs` | — |

> **Nota sobre la región del PostgreSQL:** La suscripción Azure for Students de la UCB tiene una política que restringe el servicio PostgreSQL Flexible Server en todas las regiones excepto **Brazil South**. Por eso el servidor está allí mientras el resto de recursos están en East US. Esto es normal — Azure permite mezclar regiones en un mismo Resource Group.

---

## URLs del sistema

| Servicio | URL |
|---|---|
| **Frontend (app)** | https://gastos-frontend.proudsmoke-50d3b336.eastus.azurecontainerapps.io |
| **Backend health check** | https://gastos-backend.proudsmoke-50d3b336.eastus.azurecontainerapps.io/ |
| **Backend API base** | https://gastos-backend.proudsmoke-50d3b336.eastus.azurecontainerapps.io/api |

---

## FASE 0 — Instalar herramientas

> Ejecutar en **PowerShell como Administrador**. Solo se hace una vez en el equipo.

### Paso 0.1 — Azure CLI

Azure CLI es la herramienta de línea de comandos para controlar Azure desde la terminal.

```powershell
winget install --id Microsoft.AzureCLI --silent --accept-package-agreements --accept-source-agreements
```

Esperar a que diga `Instalado correctamente`. Luego **cerrar la terminal y abrir una nueva**. Verificar:

```powershell
az --version
```

Debe mostrar `azure-cli 2.x.x` o superior.

---

### Paso 0.2 — Docker Desktop

Docker construye y ejecuta los contenedores. Es necesario para hacer los builds de las imágenes.

1. Descargar desde: https://www.docker.com/products/docker-desktop/
2. Instalar y reiniciar el equipo si lo solicita
3. Abrir Docker Desktop y esperar a que el ícono de la ballena esté en verde

Verificar en PowerShell:
```powershell
docker --version
```

---

### Paso 0.3 — Cliente PostgreSQL (psql)

Se usa una sola vez para ejecutar el script que crea las tablas en la base de datos.

```powershell
winget install --id PostgreSQL.PostgreSQL.16 --silent --accept-package-agreements --accept-source-agreements
```

Cerrar y abrir terminal nueva. Verificar:
```powershell
psql --version
```

> Si el comando no se reconoce después de reiniciar, agregar manualmente el PATH:
> ```powershell
> $env:PATH += ";C:\Program Files\PostgreSQL\16\bin"
> ```

---

### Paso 0.4 — Clonar el repositorio

```powershell
git clone https://github.com/albertoamas/app-gastos.git
cd app-gastos
```

---

## FASE 1 — Login en Azure

### Paso 1.1 — Iniciar sesión en Azure CLI

```powershell
az login
```

Este comando abre el navegador automáticamente. Iniciar sesión con la cuenta que tiene los créditos Azure for Students.

Al volver a la terminal aparecerá una tabla con las suscripciones disponibles:

```
No     Subscription name    Subscription ID                       Tenant
-----  -------------------  ------------------------------------  ------
[1] *  Azure for Students   dffcc809-c0d1-4eb2-bf73-850636482a19  UCB
```

Presionar **Enter** para confirmar la suscripción por defecto.

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

Si la sesión expira durante el proceso, ejecutar `az login` nuevamente. También ejecutar esto para asegurarse que la suscripción correcta está activa:
```powershell
az account set --subscription "dffcc809-c0d1-4eb2-bf73-850636482a19"
```

---

### Paso 1.2 — Registrar proveedores de Azure

La primera vez hay que habilitar los servicios que se van a usar. Ejecutar cada uno y esperar el prompt `PS>` antes del siguiente:

```powershell
az provider register --namespace Microsoft.ContainerRegistry --wait
```
```powershell
az provider register --namespace Microsoft.App --wait
```
```powershell
az provider register --namespace Microsoft.DBforPostgreSQL --wait
```
```powershell
az provider register --namespace Microsoft.OperationalInsights --wait
```

Verificar que todos quedaron registrados (deben responder `Registered`):
```powershell
az provider show --namespace Microsoft.ContainerRegistry --query "registrationState" -o tsv
az provider show --namespace Microsoft.App --query "registrationState" -o tsv
az provider show --namespace Microsoft.DBforPostgreSQL --query "registrationState" -o tsv
az provider show --namespace Microsoft.OperationalInsights --query "registrationState" -o tsv
```

---

## FASE 2 — Crear infraestructura en Azure

> Todos los recursos quedan agrupados en `rg-gastos-prod`. Esto permite verlos todos juntos y eliminarlos de una sola vez al final.

### Paso 2.1 — Resource Group

El Resource Group es el "contenedor" lógico que agrupa todos los recursos del proyecto en Azure.

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

### Paso 2.2 — Azure Container Registry (ACR)

El ACR es como un repositorio privado de imágenes Docker, similar a Docker Hub pero dentro de Azure. GitHub Actions sube las imágenes aquí y Azure Container Apps las descarga desde aquí.

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

Ver y anotar las credenciales del ACR (se usan en los GitHub Secrets):
```powershell
az acr credential show --name "gastosprodacr" --output table
```

Anotar el `USERNAME` y el primer `PASSWORD`.

---

### Paso 2.3 — Azure Database for PostgreSQL Flexible Server

La base de datos administrada que guarda todos los usuarios y gastos.

> **Importante:** En la suscripción Azure for Students de la UCB, este servicio solo está disponible en la región **Brazil South**. Por eso se usa `--location "brazilsouth"` aunque el resto de recursos está en East US.

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

**Este comando tarda ~5 minutos.** Al terminar verificar:

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

Crear la base de datos `gastos_db` dentro del servidor:
```powershell
az postgres flexible-server db create `
  --resource-group "rg-gastos-prod" `
  --server-name "gastos-pg-brs" `
  --name "gastos_db"
```

---

### Paso 2.4 — Configurar firewall de PostgreSQL

Por defecto PostgreSQL en Azure bloquea todas las conexiones. Hay que abrir dos reglas:

**Regla 1 — Servicios de Azure** (permite que Container Apps se conecte):
```powershell
az postgres flexible-server firewall-rule create `
  --resource-group "rg-gastos-prod" `
  --server-name "gastos-pg-brs" `
  --name "AllowAzureServices" `
  --start-ip-address "0.0.0.0" `
  --end-ip-address "0.0.0.0"
```

**Regla 2 — IP del equipo actual** (permite ejecutar el script de inicialización desde tu máquina):
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

El archivo `backend/init.sql` crea las tablas `users` y `gastos`. Se ejecuta **una sola vez**.

Primero agregar psql al PATH si no está disponible:
```powershell
$env:PATH += ";C:\Program Files\PostgreSQL\16\bin"
```

Ejecutar el script:
```powershell
psql "host=gastos-pg-brs.postgres.database.azure.com port=5432 dbname=gastos_db user=gastosadmin password=G4st0s#Prod2024! sslmode=require" -f backend/init.sql
```

Resultado esperado:
```
CREATE TABLE
CREATE TABLE
```

Verificar que las tablas existen:
```powershell
psql "host=gastos-pg-brs.postgres.database.azure.com port=5432 dbname=gastos_db user=gastosadmin password=G4st0s#Prod2024! sslmode=require" -c "\dt"
```

Resultado esperado:
```
 Esquema | Nombre | Tipo  |     Dueño
---------+--------+-------+--------------
 public  | gastos | tabla | gastosadmin
 public  | users  | tabla | gastosadmin
```

---

### Paso 2.6 — Container Apps Environment

El Environment es la red virtual privada donde van a correr todos los contenedores. Es equivalente a la red `gastos_net` del `docker-compose.yml` local: todos los contenedores dentro del mismo environment pueden comunicarse entre sí.

```powershell
az containerapp env create `
  --name "gastos-env" `
  --resource-group "rg-gastos-prod" `
  --location "eastus" `
  --output table
```

Tarda ~2 minutos. Resultado esperado:
```
Name        Location    ResourceGroup    ProvisioningState
----------  ----------  ---------------  -------------------
gastos-env  East US     rg-gastos-prod   Succeeded
```

---

### Paso 2.7 — Login al ACR y build de imágenes Docker

Antes de crear los Container Apps hay que construir y subir las imágenes Docker al ACR.

Login al ACR:
```powershell
az acr login --name "gastosprodacr"
```

**Build y push del backend:**
```powershell
docker build -t "gastosprodacr.azurecr.io/gastos-backend:latest" ./backend
docker push "gastosprodacr.azurecr.io/gastos-backend:latest"
```

---

### Paso 2.8 — Backend Container App

Crea el contenedor del backend. Le pasa todas las variables de entorno que necesita para conectarse a PostgreSQL y generar tokens JWT.

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
  --query "properties.configuration.ingress.fqdn" `
  --output tsv
```

El comando imprime la URL del backend al finalizar. **Guardar esta URL.**

Verificar que responde:
```powershell
Invoke-RestMethod -Uri "https://<URL-DEL-BACKEND>/"
```

Resultado esperado:
```
status  message
------  --------------------------------
ok      API de Control de Gastos ✅
```

---

### Paso 2.9 — Frontend Container App

El frontend necesita saber la URL del backend **en tiempo de build** porque Vite la "hornea" dentro del bundle JavaScript. Por eso se pasa como `--build-arg` al `docker build`.

Reemplazar `<URL-DEL-BACKEND>` con la URL obtenida en el paso anterior:

```powershell
$BACKEND_URL = "https://<URL-DEL-BACKEND>"
$ACR_PASSWORD = az acr credential show --name "gastosprodacr" --query "passwords[0].value" -o tsv

docker build `
  --build-arg VITE_API_URL=$BACKEND_URL `
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
  --query "properties.configuration.ingress.fqdn" `
  --output tsv
```

El comando imprime la URL del frontend. Abrir esa URL en el navegador para confirmar que la app carga.

---

## FASE 3 — Configurar CI/CD con GitHub Actions

GitHub Actions es el servicio de CI/CD integrado en GitHub. Cada vez que hagás un `git push`, detecta los cambios automáticamente y ejecuta los workflows que están en `.github/workflows/`.

### ¿Qué hacen los workflows?

**`deploy-backend.yml`** — se activa cuando hay cambios en `backend/`:
1. Hace login en Azure usando el Service Principal
2. Hace login al ACR
3. Construye la imagen Docker del backend etiquetada con el SHA del commit
4. Sube la imagen al ACR
5. Actualiza el Container App `gastos-backend` con la nueva imagen

**`deploy-frontend.yml`** — se activa cuando hay cambios en `frontend/`:
1. Hace login en Azure
2. Hace login al ACR
3. Construye la imagen Docker del frontend pasando `VITE_API_URL` como argumento de build
4. Sube la imagen al ACR
5. Actualiza el Container App `gastos-frontend`

Para que estos workflows funcionen, necesitan credenciales guardadas como **Secrets** en GitHub.

---

### Paso 3.1 — Crear el Service Principal

El Service Principal es una identidad de Azure que GitHub Actions usa para autenticarse y hacer deployments de forma automática y segura, sin necesitar contraseña de usuario.

```powershell
az ad sp create-for-rbac `
  --name "github-actions-gastos" `
  --role contributor `
  --scopes /subscriptions/dffcc809-c0d1-4eb2-bf73-850636482a19/resourceGroups/rg-gastos-prod `
  --sdk-auth
```

El comando devuelve un JSON. **Copiar todo el bloque** (desde `{` hasta `}`).

Dar permiso al Service Principal para subir imágenes al ACR:
```powershell
$SP_ID = az ad sp list --display-name "github-actions-gastos" --query "[0].appId" -o tsv
$ACR_ID = az acr show --name "gastosprodacr" --query "id" -o tsv

az role assignment create `
  --assignee $SP_ID `
  --role AcrPush `
  --scope $ACR_ID
```

---

### Paso 3.2 — Configurar Secrets en GitHub

Ir a: **https://github.com/albertoamas/app-gastos/settings/secrets/actions**

Hacer clic en **New repository secret** y agregar los siguientes cuatro:

---

**Secret 1: `AZURE_CREDENTIALS`**

Pegar el JSON completo del Service Principal. Se ve así:
```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "dffcc809-c0d1-4eb2-bf73-850636482a19",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  ...
}
```

*Para qué sirve:* Permite que GitHub Actions se autentique en Azure para desplegar los contenedores.

---

**Secret 2: `ACR_NAME`**

Valor:
```
gastosprodacr
```

*Para qué sirve:* Nombre del Container Registry donde se suben las imágenes Docker.

---

**Secret 3: `ACR_LOGIN_SERVER`**

Valor:
```
gastosprodacr.azurecr.io
```

*Para qué sirve:* URL del Container Registry. Se usa como prefijo al etiquetar las imágenes (`gastosprodacr.azurecr.io/gastos-backend:latest`).

---

**Secret 4: `VITE_API_URL`**

Valor:
```
https://gastos-backend.proudsmoke-50d3b336.eastus.azurecontainerapps.io
```

*Para qué sirve:* URL del backend que se "hornea" dentro del bundle del frontend durante el build. Sin este valor el frontend no sabría a dónde enviar las peticiones de la API.

---

### Paso 3.3 — Probar el CI/CD

Hacer un cambio mínimo y hacer push para verificar que el pipeline se activa:

```powershell
# Agregar una línea vacía al final del README para disparar el workflow
Add-Content -Path "README.md" -Value ""
git add README.md
git commit -m "test: trigger CI/CD pipeline"
git push origin main
```

Ir a **https://github.com/albertoamas/app-gastos/actions** para ver el workflow ejecutándose.

> Los workflows solo se activan cuando hay cambios en `backend/` o `frontend/`. Para probarlos, modificar cualquier archivo dentro de esas carpetas.

---

## FASE 4 — Verificación end-to-end

Abrir la app en el navegador:
**https://gastos-frontend.proudsmoke-50d3b336.eastus.azurecontainerapps.io**

Probar el flujo completo:

1. **Registro** — crear una cuenta con nombre, email y contraseña
2. **Login** — iniciar sesión con las credenciales creadas
3. **Agregar gasto** — ingresar monto, descripción y fecha → debe aparecer en el dashboard
4. **Historial** — ir a la página de historial → el gasto debe estar en la tabla
5. **Filtrar** — usar el filtro por mes → solo deben aparecer gastos del mes seleccionado
6. **Eliminar** — eliminar un gasto → debe desaparecer de la lista
7. **Persistencia** — cerrar sesión, volver a iniciar → los datos deben seguir ahí

---

## Flujo de trabajo diario (para hacer cambios)

Una vez configurado todo, el flujo es:

```powershell
# 1. Modificar archivos del proyecto (backend/ o frontend/)
# 2. Guardar los cambios en git
git add .
git commit -m "descripcion del cambio"
git push origin main
```

GitHub Actions detecta el push y despliega automáticamente en ~3 minutos. Ver el progreso en https://github.com/albertoamas/app-gastos/actions

---

## Comandos de mantenimiento

```powershell
# Ver todos los recursos del proyecto en Azure
az resource list --resource-group "rg-gastos-prod" --output table

# Ver el estado de los Container Apps
az containerapp list --resource-group "rg-gastos-prod" --output table

# Ver logs del backend en tiempo real (útil para depurar errores)
az containerapp logs show `
  --name "gastos-backend" `
  --resource-group "rg-gastos-prod" `
  --follow

# Ver logs del frontend
az containerapp logs show `
  --name "gastos-frontend" `
  --resource-group "rg-gastos-prod" `
  --follow

# Reiniciar el backend
az containerapp revision restart `
  --name "gastos-backend" `
  --resource-group "rg-gastos-prod" `
  --revision $(az containerapp revision list --name "gastos-backend" --resource-group "rg-gastos-prod" --query "[0].name" -o tsv)

# Apagar los Container Apps para ahorrar crédito (cuando no se usen)
az containerapp update --name "gastos-backend" --resource-group "rg-gastos-prod" --min-replicas 0 --max-replicas 0
az containerapp update --name "gastos-frontend" --resource-group "rg-gastos-prod" --min-replicas 0 --max-replicas 0

# Volver a encender
az containerapp update --name "gastos-backend" --resource-group "rg-gastos-prod" --min-replicas 1 --max-replicas 1
az containerapp update --name "gastos-frontend" --resource-group "rg-gastos-prod" --min-replicas 1 --max-replicas 1

# Eliminar TODOS los recursos al final del semestre (libera todo el crédito)
az group delete --name "rg-gastos-prod" --yes --no-wait
```

---

## Solución de problemas comunes

**El frontend carga pero no puede conectarse al backend**
- Verificar que el secret `VITE_API_URL` en GitHub apunta a la URL correcta del backend
- Reconstruir y redesplegar el frontend con `docker build --build-arg VITE_API_URL=...`

**El backend responde 500 Internal Server Error**
- Ver los logs: `az containerapp logs show --name "gastos-backend" --resource-group "rg-gastos-prod" --follow`
- Verificar que las variables de entorno de PostgreSQL están correctas
- Verificar que el firewall de PostgreSQL permite conexiones desde Azure (`AllowAzureServices`)

**GitHub Actions falla con "unauthorized"**
- Verificar que el secret `AZURE_CREDENTIALS` contiene el JSON completo y correcto
- Verificar que el secret `ACR_NAME` y `ACR_LOGIN_SERVER` están bien escritos

**Error "The location is restricted" al crear PostgreSQL**
- Usar `--location "brazilsouth"` en lugar de `eastus`
- Esta restricción es específica de la suscripción Azure for Students de la UCB

---

## Checklist de progreso

- [x] Paso 0.1 — Azure CLI instalado (`az --version` → 2.87.0)
- [x] Paso 0.2 — Docker Desktop instalado y corriendo
- [x] Paso 0.3 — Cliente psql instalado
- [x] Paso 1.1 — Login en Azure (`Azure for Students` activa)
- [x] Paso 1.2 — Proveedores registrados (ContainerRegistry, App, DBforPostgreSQL, OperationalInsights)
- [x] Paso 2.1 — Resource Group creado (`rg-gastos-prod` en eastus)
- [x] Paso 2.2 — ACR creado (`gastosprodacr.azurecr.io`)
- [x] Paso 2.3 — PostgreSQL creado (`gastos-pg-brs` en brazilsouth — estado: Ready)
- [x] Paso 2.3b — Base de datos `gastos_db` creada
- [x] Paso 2.4 — Firewall configurado (AllowAzureServices + AllowMyIP)
- [x] Paso 2.5 — Schema SQL inicializado (tablas `users` y `gastos` creadas y verificadas)
- [x] Paso 2.6 — Container Apps Environment creado (`gastos-env` en eastus)
- [x] Paso 2.7 — Imágenes Docker del backend y frontend subidas al ACR
- [x] Paso 2.8 — Backend Container App corriendo → health check OK ✅
- [x] Paso 2.9 — Frontend Container App creado
- [x] Paso 3.1 — Service Principal `github-actions-gastos` creado (roles: Contributor + AcrPush)
- [x] Paso 3.2 — 4 secrets configurados en GitHub (AZURE_CREDENTIALS, ACR_NAME, ACR_LOGIN_SERVER, VITE_API_URL)
- [ ] Paso 3.3 — CI/CD probado con un push de prueba
- [ ] Fase 4 — Verificación end-to-end completa en el navegador
