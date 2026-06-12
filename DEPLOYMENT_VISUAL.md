# Guía de Despliegue Visual — App-Gastos en Azure Portal

> Esta guía te enseña a desplegar App-Gastos usando el **portal web de Azure** (portal.azure.com), sin necesidad de memorizar comandos. Sigue cada paso en orden, todos los campos importantes están marcados con ➤.

---

## ¿Qué vas a hacer?

Al terminar esta guía tendrás:

```
portal.azure.com  (tú controlas todo desde aquí)
        │
        ▼
  rg-gastos-prod  (Resource Group — carpeta que agrupa todo)
  ├── gastosprodacr          → guarda las imágenes Docker
  ├── gastos-pg-brs          → base de datos PostgreSQL
  ├── gastos-env             → red privada de contenedores
  ├── gastos-backend         → API Node.js corriendo en la nube
  └── gastos-frontend        → app React corriendo en la nube

GitHub Actions  (despliega automáticamente al hacer git push)
```

---

## Herramientas necesarias en tu computadora

Algunas tareas (construir imágenes Docker, inicializar la base de datos) **no se pueden hacer desde el portal** — necesitan la terminal. Instala estas herramientas antes de empezar:

### Docker Desktop
Construye las imágenes de la aplicación.
1. Ir a https://www.docker.com/products/docker-desktop/
2. Descargar e instalar
3. Abrir Docker Desktop y esperar a que el ícono de la ballena esté en **verde**

Verificar en PowerShell:
```powershell
docker --version
# Debe mostrar: Docker version 27.x.x
```

### Cliente psql (PostgreSQL)
Se usa una sola vez para crear las tablas en la base de datos.
```powershell
winget install --id PostgreSQL.PostgreSQL.16 --silent --accept-package-agreements
```
Cerrar y abrir una terminal nueva. Verificar:
```powershell
psql --version
# Debe mostrar: psql (PostgreSQL) 16.x
```
> Si no funciona, agregar al PATH manualmente:
> ```powershell
> $env:PATH += ";C:\Program Files\PostgreSQL\16\bin"
> ```

### Azure CLI
Se usa solo en el Paso 9 para crear el Service Principal.
```powershell
winget install --id Microsoft.AzureCLI --silent --accept-package-agreements
```
Cerrar y abrir terminal nueva. Verificar:
```powershell
az --version
# Debe mostrar: azure-cli 2.x.x
```

### Clonar el repositorio
```powershell
git clone https://github.com/albertoamas/app-gastos.git
cd app-gastos
```

---

## PASO 1 — Iniciar sesión en Azure Portal

1. Abrir el navegador y entrar a **https://portal.azure.com**
2. Iniciar sesión con la cuenta que tiene los créditos Azure for Students
3. Al ingresar verás el **Panel de inicio** (Home) con accesos directos y recursos recientes

> La barra de búsqueda en la parte superior (con lupa 🔍) es tu herramienta principal. Úsala para encontrar cualquier servicio escribiendo su nombre.

---

## PASO 2 — Crear el Resource Group

El Resource Group es una "carpeta" en Azure que agrupa todos los recursos del proyecto. Así los puedes ver juntos, controlar costos y eliminarlos todos de una vez al final.

1. En la barra de búsqueda escribir: **`grupos de recursos`**
2. Hacer clic en **Grupos de recursos**
3. Hacer clic en el botón **+ Crear**

Llenar el formulario:

| Campo | Valor |
|---|---|
| ➤ Suscripción | `Azure for Students` |
| ➤ Grupo de recursos | `rg-gastos-prod` |
| ➤ Región | `(US) East US` |

4. Hacer clic en **Revisar y crear**
5. Verificar que aparece el mensaje **Validación superada** en verde
6. Hacer clic en **Crear**

**Resultado esperado:** Aparece la pantalla del grupo con el mensaje "rg-gastos-prod se creó correctamente".

---

## PASO 3 — Crear el Container Registry (ACR)

El Container Registry es un repositorio privado de imágenes Docker dentro de Azure. Es donde se guardan las "fotos" empaquetadas del backend y frontend.

1. En la barra de búsqueda escribir: **`container registry`**
2. Hacer clic en **Container registries**
3. Hacer clic en **+ Crear**

**Pestaña Básico:**

| Campo | Valor |
|---|---|
| ➤ Suscripción | `Azure for Students` |
| ➤ Grupo de recursos | `rg-gastos-prod` |
| ➤ Nombre del registro | `gastosprodacr` |
| ➤ Ubicación | `East US` |
| ➤ SKU | `Basic` |

4. Hacer clic en **Revisar y crear** → **Crear**
5. Esperar ~1 minuto. Hacer clic en **Ir al recurso**

**Habilitar el usuario administrador** (necesario para que GitHub Actions pueda subir imágenes):

6. En el menú de la izquierda, ir a **Configuración → Claves de acceso**
7. Activar el toggle **Usuario administrador** → debe quedar en azul (**Habilitado**)
8. Anotar los valores que aparecen:
   - **Servidor de inicio de sesión:** `gastosprodacr.azurecr.io`
   - **Nombre de usuario:** `gastosprodacr`
   - **Contraseña:** (copiar el primer valor, el largo)

> Guarda estas credenciales — las necesitarás en el Paso 9.

---

## PASO 4 — Crear el servidor PostgreSQL

La base de datos donde se guardan los usuarios y gastos de la aplicación.

> **Nota importante:** En la suscripción Azure for Students de la UCB, este servicio solo funciona en la región **Brazil South**. No intentes usar otra región para este paso específico.

1. En la barra de búsqueda escribir: **`azure database for postgresql`**
2. Hacer clic en **Azure Database for PostgreSQL flexible servers**
3. Hacer clic en **+ Crear**
4. Seleccionar la opción **Flexible server**

**Pestaña Básico:**

| Campo | Valor |
|---|---|
| ➤ Suscripción | `Azure for Students` |
| ➤ Grupo de recursos | `rg-gastos-prod` |
| ➤ Nombre del servidor | `gastos-pg-brs` |
| ➤ Región | `(South America) Brazil South` |
| ➤ Versión de PostgreSQL | `16` |
| ➤ Tipo de carga de trabajo | `Desarrollo` (o **Burstable** si aparece) |

**Sección Proceso y almacenamiento** (hacer clic en "Configurar servidor"):
- ➤ Nivel de proceso: `Burstable`
- ➤ Tamaño de proceso: `Standard_B1ms (1 núcleo, 2 GB RAM)`
- ➤ Almacenamiento: `32 GiB`
- Hacer clic en **Guardar**

**Sección Autenticación:**

| Campo | Valor |
|---|---|
| ➤ Método de autenticación | `Solo autenticación de PostgreSQL` |
| ➤ Nombre de usuario administrador | `gastosadmin` |
| ➤ Contraseña | `G4st0s#Prod2024!` |
| ➤ Confirmar contraseña | `G4st0s#Prod2024!` |

5. Hacer clic en la pestaña **Redes**

**Pestaña Redes:**

| Configuración | Valor |
|---|---|
| ➤ Método de conectividad | `Acceso público (direcciones IP permitidas)` |
| ➤ Permitir acceso público... | ✅ Activar el checkbox **"Permitir el acceso público desde cualquier servicio de Azure dentro de Azure a este servidor"** |

**Agregar tu IP actual para poder inicializar la base de datos:**
- Hacer clic en **+ Agregar dirección IP del cliente actual**
- Aparecerá una regla con tu IP automáticamente

6. Hacer clic en **Revisar y crear** → **Crear**

> Este proceso tarda **5-8 minutos**. Puedes seguir en el siguiente paso mientras espera.

7. Cuando termine, hacer clic en **Ir al recurso**
8. Verificar que el estado dice **Disponible**

---

## PASO 5 — Crear la base de datos dentro del servidor

El servidor PostgreSQL es el motor. Ahora hay que crear la base de datos específica de la aplicación dentro de ese servidor.

1. Estando en el recurso `gastos-pg-brs`, ir al menú izquierdo
2. Hacer clic en **Configuración → Bases de datos**
3. Hacer clic en **+ Agregar**
4. ➤ Nombre: `gastos_db`
5. Hacer clic en **Guardar**

---

## PASO 6 — Inicializar las tablas (terminal)

Este paso **requiere la terminal** porque el portal no permite ejecutar scripts SQL directamente. Se hace una sola vez.

Abrir **PowerShell** en la carpeta del proyecto y ejecutar:

```powershell
# Si psql no se encuentra, agregar al PATH primero:
$env:PATH += ";C:\Program Files\PostgreSQL\16\bin"

# Ejecutar el script que crea las tablas users y gastos
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
 Esquema | Nombre | Tipo  
---------+--------+-------
 public  | gastos | tabla
 public  | users  | tabla
```

---

## PASO 7 — Construir y subir las imágenes Docker (terminal)

Este paso **requiere la terminal** porque Docker no tiene interfaz en el portal de Azure. Se construyen las imágenes y se suben al ACR creado en el Paso 3.

Abrir **PowerShell** en la carpeta del proyecto:

```powershell
# Login al Container Registry
az login
az acr login --name "gastosprodacr"
```

**Imagen del backend:**
```powershell
docker build -t "gastosprodacr.azurecr.io/gastos-backend:latest" ./backend
docker push "gastosprodacr.azurecr.io/gastos-backend:latest"
```

**Imagen del frontend** (necesita la URL del backend que obtendrás en el Paso 8):
> Completa este sub-paso DESPUÉS de crear el backend en el Paso 8 y obtener su URL.

```powershell
# Reemplazar <URL-DEL-BACKEND> con la URL real del Paso 8
docker build `
  --build-arg VITE_API_URL="https://<URL-DEL-BACKEND>" `
  -t "gastosprodacr.azurecr.io/gastos-frontend:latest" `
  ./frontend

docker push "gastosprodacr.azurecr.io/gastos-frontend:latest"
```

> **¿Por qué el frontend necesita la URL del backend en el build?**
> La app React usa Vite, que "hornea" las variables de entorno dentro del bundle JavaScript en tiempo de compilación. No se puede cambiar después sin recompilar.

---

## PASO 8 — Crear los Container Apps

### 8.1 — Crear el Container App del Backend

1. En la barra de búsqueda escribir: **`container apps`**
2. Hacer clic en **Container Apps**
3. Hacer clic en **+ Crear**

**Pestaña Básico:**

| Campo | Valor |
|---|---|
| ➤ Suscripción | `Azure for Students` |
| ➤ Grupo de recursos | `rg-gastos-prod` |
| ➤ Nombre de la aplicación de contenedor | `gastos-backend` |
| ➤ Región | `East US` |
| ➤ Entorno de Container Apps | Hacer clic en **Crear nuevo** |

**Crear nuevo entorno** (ventana emergente):
- ➤ Nombre del entorno: `gastos-env`
- ➤ Región: `East US`
- Hacer clic en **Crear**

4. Hacer clic en la pestaña **Contenedor**

**Pestaña Contenedor:**

- Desmarcar el checkbox **"Usar imagen de inicio rápido"**

| Campo | Valor |
|---|---|
| ➤ Origen de imagen | `Azure Container Registry` |
| ➤ Registro | `gastosprodacr` |
| ➤ Imagen | `gastos-backend` |
| ➤ Etiqueta de imagen | `latest` |

**Variables de entorno** — hacer clic en **+ Agregar** para cada una:

| Nombre | Valor |
|---|---|
| `PORT` | `3001` |
| `PGHOST` | `gastos-pg-brs.postgres.database.azure.com` |
| `PGPORT` | `5432` |
| `PGUSER` | `gastosadmin` |
| `PGPASSWORD` | `G4st0s#Prod2024!` |
| `PGDATABASE` | `gastos_db` |
| `PGSSL` | `true` |
| `JWT_SECRET` | `j8Kx2mNpQ5vRwY9zAcFhLtBuDeGiJoMs` |
| `NODE_ENV` | `production` |

5. Hacer clic en la pestaña **Entrada**

**Pestaña Entrada (Ingress):**

| Campo | Valor |
|---|---|
| ➤ Entrada | ✅ Activar el checkbox **"Habilitado"** |
| ➤ Tráfico de entrada | `Aceptar tráfico desde cualquier lugar` |
| ➤ Puerto de destino | `3001` |

6. Hacer clic en **Revisar y crear** → **Crear**
7. Cuando termine, hacer clic en **Ir al recurso**
8. En la pantalla del recurso, copiar la **URL de la aplicación** que aparece en la parte superior

> La URL tiene esta forma: `https://gastos-backend.proudsmoke-XXXXX.eastus.azurecontainerapps.io`
> **Guarda esta URL** — la necesitas para construir la imagen del frontend (Paso 7) y para el Paso 8.2.

**Verificar que el backend funciona:**
Abrir el navegador y entrar a la URL del backend. Debe mostrar:
```json
{"status":"ok","message":"API de Control de Gastos ✅"}
```

---

### 8.2 — Construir y subir la imagen del frontend

Ahora que tienes la URL del backend, volver al **Paso 7** y ejecutar los comandos del frontend con la URL real.

---

### 8.3 — Crear el Container App del Frontend

1. En **Container Apps**, hacer clic en **+ Crear**

**Pestaña Básico:**

| Campo | Valor |
|---|---|
| ➤ Suscripción | `Azure for Students` |
| ➤ Grupo de recursos | `rg-gastos-prod` |
| ➤ Nombre | `gastos-frontend` |
| ➤ Región | `East US` |
| ➤ Entorno | `gastos-env` (seleccionar el que ya existe) |

2. Pestaña **Contenedor**:

- Desmarcar **"Usar imagen de inicio rápido"**

| Campo | Valor |
|---|---|
| ➤ Origen de imagen | `Azure Container Registry` |
| ➤ Registro | `gastosprodacr` |
| ➤ Imagen | `gastos-frontend` |
| ➤ Etiqueta | `latest` |

3. Pestaña **Entrada**:

| Campo | Valor |
|---|---|
| ➤ Entrada | ✅ Habilitado |
| ➤ Tráfico | `Aceptar tráfico desde cualquier lugar` |
| ➤ Puerto de destino | `80` |

4. **Revisar y crear** → **Crear**
5. Ir al recurso → copiar la URL del frontend
6. Abrir esa URL en el navegador — debe cargar la app completa

---

## PASO 9 — Configurar CI/CD con GitHub Actions

GitHub Actions despliega automáticamente cada vez que haces un `git push`. Para que funcione, necesita credenciales para autenticarse en Azure.

### 9.1 — Crear el Service Principal

El Service Principal es una identidad de Azure para que GitHub Actions pueda desplegar sin usar tu contraseña personal.

**Este paso requiere la terminal:**

```powershell
# Login en Azure (abre el navegador)
az login

# Crear el Service Principal y guardar el JSON de salida
az ad sp create-for-rbac `
  --name "github-actions-gastos" `
  --role contributor `
  --scopes /subscriptions/dffcc809-c0d1-4eb2-bf73-850636482a19/resourceGroups/rg-gastos-prod `
  --sdk-auth
```

El comando imprime un bloque JSON. **Copiar TODO el bloque** (desde `{` hasta `}`).

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

### 9.2 — Configurar los Secrets en GitHub

Los Secrets son variables privadas que GitHub Actions usa internamente. Nunca se muestran en los logs.

1. Ir a: **https://github.com/albertoamas/app-gastos/settings/secrets/actions**
2. Para cada secret, hacer clic en **New repository secret**, escribir el nombre y pegar el valor

---

**Secret 1: `AZURE_CREDENTIALS`**
- **Nombre:** `AZURE_CREDENTIALS`
- **Valor:** El bloque JSON completo del Service Principal (del paso anterior)

```json
{
  "clientId": "...",
  "clientSecret": "...",
  "subscriptionId": "dffcc809-c0d1-4eb2-bf73-850636482a19",
  "tenantId": "...",
  ...
}
```

*¿Para qué sirve?* Permite a GitHub Actions autenticarse en Azure para desplegar.

---

**Secret 2: `ACR_NAME`**
- **Nombre:** `ACR_NAME`
- **Valor:** `gastosprodacr`

*¿Para qué sirve?* Nombre del Container Registry donde se guardan las imágenes.

---

**Secret 3: `ACR_LOGIN_SERVER`**
- **Nombre:** `ACR_LOGIN_SERVER`
- **Valor:** `gastosprodacr.azurecr.io`

*¿Para qué sirve?* URL completa del registry. Se usa como prefijo al nombrar imágenes.

---

**Secret 4: `VITE_API_URL`**
- **Nombre:** `VITE_API_URL`
- **Valor:** La URL del backend del Paso 8.1

Ejemplo:
```
https://gastos-backend.proudsmoke-50d3b336.eastus.azurecontainerapps.io
```

*¿Para qué sirve?* Se inyecta en el build del frontend para que sepa a qué URL llamar.

---

### 9.3 — Verificar que el CI/CD funciona

Hacer un cambio pequeño en el proyecto y hacer push:

```powershell
# Desde la carpeta del proyecto
Add-Content -Path "frontend/src/pages/Landing.jsx" -Value ""
git add .
git commit -m "test: verificar CI/CD automático"
git push origin main
```

Ir a **https://github.com/albertoamas/app-gastos/actions** — debe aparecer el workflow **"Deploy Frontend"** ejecutándose (ícono amarillo girando).

Esperar ~3 minutos. El ícono cambia a ✅ verde cuando termina.

---

## PASO 10 — Verificación final en el navegador

Abrir la URL del frontend en el navegador y probar el flujo completo:

| Acción | Resultado esperado |
|---|---|
| Abrir la app | Carga la landing page con diseño correcto |
| Ir a Crear cuenta | Formulario de registro visible |
| Registrarse | Redirige al dashboard |
| Agregar un gasto | Aparece en la lista inmediatamente |
| Ir a Historial | El gasto aparece en la tabla |
| Filtrar por mes | Solo muestra gastos del mes seleccionado |
| Cerrar sesión | Redirige a la landing |
| Iniciar sesión | Los datos anteriores siguen ahí |

---

## Ver tus recursos en el portal

En cualquier momento puedes ver todos los recursos del proyecto:

1. Ir a **portal.azure.com**
2. Buscar **"rg-gastos-prod"** en la barra de búsqueda
3. Hacer clic en el Resource Group
4. Verás todos los recursos listados:

```
gastosprodacr          Container registry
gastos-pg-brs          Azure Database for PostgreSQL flexible server
gastos-env             Container Apps Environment
gastos-backend         Container App
gastos-frontend        Container App
```

---

## Monitorear y depurar desde el portal

### Ver logs del backend
1. Ir al recurso `gastos-backend` en Container Apps
2. Menú izquierdo → **Supervisión → Flujo de registros**
3. Los logs aparecen en tiempo real

### Ver logs del frontend
Mismo proceso en el recurso `gastos-frontend`.

### Reiniciar un Container App
1. Ir al recurso
2. Menú izquierdo → **Revisiones y réplicas**
3. Hacer clic en la revisión activa → **Reiniciar**

### Apagar para ahorrar crédito
1. Ir al Container App
2. Menú izquierdo → **Escalar**
3. Cambiar **Réplicas mínimas** a `0` → **Guardar**

Para volver a encender: cambiar a `1`.

---

## Eliminar todo al final del semestre

Para liberar el crédito cuando ya no necesites la app:

1. Ir a **portal.azure.com**
2. Buscar y abrir **rg-gastos-prod**
3. Hacer clic en **Eliminar grupo de recursos**
4. Escribir `rg-gastos-prod` en el campo de confirmación
5. Hacer clic en **Eliminar**

Esto elimina **todos los recursos del proyecto** de una sola vez.

---

## Checklist

- [ ] Docker Desktop instalado y corriendo
- [ ] psql instalado y verificado
- [ ] Azure CLI instalado
- [ ] Repositorio clonado localmente
- [ ] Paso 2 — Resource Group `rg-gastos-prod` creado en East US
- [ ] Paso 3 — Container Registry `gastosprodacr` creado, admin user habilitado, credenciales anotadas
- [ ] Paso 4 — PostgreSQL `gastos-pg-brs` creado en **Brazil South**, estado: Disponible
- [ ] Paso 5 — Base de datos `gastos_db` creada dentro del servidor
- [ ] Paso 6 — Script `init.sql` ejecutado (tablas `users` y `gastos` creadas)
- [ ] Paso 7 — Imagen del backend subida al ACR
- [ ] Paso 8.1 — Backend Container App corriendo, URL anotada, health check OK
- [ ] Paso 7 (segunda parte) — Imagen del frontend construida con URL del backend y subida al ACR
- [ ] Paso 8.3 — Frontend Container App corriendo, app visible en el navegador
- [ ] Paso 9.1 — Service Principal creado, JSON anotado
- [ ] Paso 9.2 — 4 Secrets configurados en GitHub
- [ ] Paso 9.3 — CI/CD probado con un push, workflow completado en verde
- [ ] Paso 10 — Verificación end-to-end completada
