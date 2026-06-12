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
  ├── gastos<TUS-INICIALES>acr   → guarda las imágenes Docker
  ├── gastos-db-server           → base de datos PostgreSQL
  ├── gastos-env                 → red privada de contenedores
  ├── gastos-backend             → API Node.js corriendo en la nube
  └── gastos-frontend            → app React corriendo en la nube

GitHub Actions  (despliega automáticamente al hacer git push)
```

---

## ⚠️ Nombres únicos en Azure — leer antes de empezar

Azure tiene dos tipos de nombres:

| Tipo | Ejemplos | Regla |
|---|---|---|
| **Globalmente únicos** | Container Registry (ACR) | Nadie en el mundo puede tener el mismo nombre |
| **Con período de reserva** | PostgreSQL Flexible Server | Después de eliminar, el nombre queda bloqueado ~5 días |
| **Libres al eliminar** | Resource Group, Container Apps | Se pueden reusar inmediatamente |

**Por eso esta guía usa nombres diferentes a los del despliegue original.** Si el portal te dice "el nombre ya está en uso", simplemente agrega un número al final (ej: `gastoscmacr2`).

### Tabla de nombres a usar en esta guía

Antes de empezar, elige el nombre de tu Container Registry reemplazando `<TUS-INICIALES>` con tus iniciales en minúsculas (ejemplo: Cecilia Morales → `cm`, entonces el ACR se llama `gastoscmacr`):

| Recurso | Nombre | Nota |
|---|---|---|
| Resource Group | `rg-gastos-prod` | Igual, se puede reusar |
| **Container Registry** | `gastos<TUS-INICIALES>acr` | **Elige un nombre único** |
| PostgreSQL Server | `gastos-db-server` | Diferente al original |
| PostgreSQL Admin | `gastosadmin` | Igual |
| PostgreSQL Base de datos | `gastos_db` | Igual |
| Container Apps Environment | `gastos-env` | Igual |
| Backend Container App | `gastos-backend` | Igual (requerido por CI/CD) |
| Frontend Container App | `gastos-frontend` | Igual (requerido por CI/CD) |
| Service Principal | `github-actions-app-gastos` | Diferente al original |

> **Ejemplo con iniciales `cm`:** el ACR se llama `gastoscmacr` y el Login Server es `gastoscmacr.azurecr.io`. Usa ese nombre en todos los pasos donde aparezca `gastos<TUS-INICIALES>acr`.

---

## Herramientas necesarias en tu computadora

Algunas tareas (construir imágenes Docker, inicializar la base de datos) **no se pueden hacer desde el portal** — necesitan la terminal. Instala estas herramientas antes de empezar.

Abrir **PowerShell como Administrador** para instalar:

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
winget install --id PostgreSQL.PostgreSQL.16 --silent --accept-package-agreements --accept-source-agreements
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
Se usa en el Paso 7 (build de imágenes) y Paso 9 (Service Principal).
```powershell
winget install --id Microsoft.AzureCLI --silent --accept-package-agreements --accept-source-agreements
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
3. Al ingresar verás el **Panel de inicio** con accesos directos y recursos recientes

> **Consejo:** La barra de búsqueda negra en la parte superior es tu herramienta principal. Úsala para encontrar cualquier servicio escribiendo su nombre. No uses el botón "Crear un recurso" — lleva al Marketplace y es más confuso.

---

## PASO 2 — Crear el Resource Group

El Resource Group es una "carpeta" en Azure que agrupa todos los recursos del proyecto. Así puedes verlos juntos, controlar costos y eliminarlos todos de una vez al final del semestre.

1. En la **barra de búsqueda negra** del tope escribir: `grupos de recursos`
2. Hacer clic en **Grupos de recursos** (ícono azul)
3. Hacer clic en el botón **+ Crear** (esquina superior izquierda)

Llenar el formulario:

| Campo | Valor |
|---|---|
| ➤ Suscripción | `Azure for Students` |
| ➤ Grupo de recursos | `rg-gastos-prod` |
| ➤ Región | `(US) East US` |

4. Hacer clic en **Revisar y crear**
5. Verificar que aparece **Validación superada** en verde
6. Hacer clic en **Crear**

**Resultado esperado:** Aparece la pantalla del grupo con el mensaje "rg-gastos-prod se creó correctamente".

---

## PASO 3 — Crear el Container Registry (ACR)

El Container Registry es como un USB privado en la nube donde se guardan las imágenes Docker empaquetadas del backend y frontend. GitHub Actions sube las imágenes aquí y Azure las descarga desde aquí para ejecutarlas.

1. En la **barra de búsqueda** escribir: `container registries`
2. Hacer clic en **Container registries**
3. Hacer clic en **+ Crear**

**Pestaña Básico:**

| Campo | Valor |
|---|---|
| ➤ Suscripción | `Azure for Students` |
| ➤ Grupo de recursos | `rg-gastos-prod` |
| ➤ Nombre del registro | `gastos<TUS-INICIALES>acr` — ejemplo: `gastoscmacr` |
| ➤ Ubicación | `East US` |
| ➤ SKU | `Basic` |

> Si el nombre dice **"El nombre ya está en uso"**, agrega un número: `gastoscmacr2`.

4. Hacer clic en **Revisar y crear** → **Crear**
5. Esperar ~1 minuto. Hacer clic en **Ir al recurso**

**Habilitar el usuario administrador** (necesario para que GitHub Actions pueda subir imágenes):

6. En el menú de la izquierda, ir a **Configuración → Claves de acceso**
7. Activar el toggle **Usuario administrador** → debe quedar en azul (**Habilitado**)
8. **Anotar estos tres valores** (los necesitarás en el Paso 9):

| Dato | Dónde está | Ejemplo |
|---|---|---|
| Servidor de inicio de sesión | Primera línea | `gastoscmacr.azurecr.io` |
| Nombre de usuario | Debajo del servidor | `gastoscmacr` |
| Contraseña | Campo "password" (el más largo) | `aBcDeFgH...` |

---

## PASO 4 — Crear el servidor PostgreSQL

La base de datos donde se guardan de forma permanente los usuarios y gastos de la aplicación.

> **Nota importante:** En la suscripción Azure for Students de la UCB, PostgreSQL Flexible Server tiene restricciones de región. Las regiones confirmadas que funcionan son **Brazil South** y **Chile Central**. Si intentas East US u otras regiones aparecerá un error de política. Si una región da error, prueba la otra.

1. En la **barra de búsqueda** escribir: `azure database for postgresql`
2. Hacer clic en **Azure Database for PostgreSQL flexible servers**
3. Hacer clic en **+ Crear**
4. Seleccionar **Flexible server** (la primera opción)

**Pestaña Básico — sección Detalles del proyecto:**

| Campo | Valor |
|---|---|
| ➤ Suscripción | `Azure for Students` |
| ➤ Grupo de recursos | `rg-gastos-prod` |

**Pestaña Básico — sección Detalles del servidor:**

| Campo | Valor |
|---|---|
| ➤ Nombre del servidor | `gastos-db-server` |
| ➤ Región | `(South America) Brazil South` o `(South America) Chile Central` |
| ➤ Versión de PostgreSQL | `16` |
| ➤ Tipo de carga de trabajo | `Desarrollo` |

**Sección Proceso y almacenamiento** — hacer clic en **"Configurar servidor"**:
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

| Configuración | Acción |
|---|---|
| ➤ Método de conectividad | Seleccionar `Acceso público (direcciones IP permitidas)` |
| ➤ Servicios de Azure | ✅ Activar el checkbox **"Permitir el acceso público desde cualquier servicio de Azure"** |
| ➤ IP actual | Hacer clic en **"+ Agregar dirección IP del cliente actual"** |

Al hacer clic en agregar IP, aparecerá una regla nueva con tu IP automáticamente.

6. Hacer clic en **Revisar y crear** → **Crear**

> Este proceso tarda **5-8 minutos**. Es normal — Azure está aprovisionando el servidor.

7. Cuando el ícono cambie a ✅ verde, hacer clic en **Ir al recurso**
8. Verificar que el campo **Estado** dice `Disponible`

---

## PASO 5 — Crear la base de datos dentro del servidor

El servidor es el motor de PostgreSQL. Ahora hay que crear la base de datos específica de la app dentro de ese servidor.

1. Estando en el recurso `gastos-db-server`, ir al menú izquierdo
2. Hacer clic en **Configuración → Bases de datos**
3. Hacer clic en **+ Agregar**
4. ➤ Nombre: `gastos_db`
5. Hacer clic en **Guardar**

**Resultado esperado:** Aparece `gastos_db` en la lista de bases de datos.

---

## PASO 6 — Crear las tablas en la base de datos (terminal)

Este paso **requiere la terminal** porque el portal no permite ejecutar scripts SQL. Se hace **una sola vez**.

El archivo `backend/init.sql` del repositorio crea las tablas `users` (para las cuentas) y `gastos` (para los gastos registrados).

Abrir **PowerShell** en la carpeta del proyecto:

```powershell
# Si psql no está disponible, agregarlo al PATH:
$env:PATH += ";C:\Program Files\PostgreSQL\16\bin"
```

> **Importante para Windows:** En PowerShell el string de conexión con comillas causa problemas. Usar siempre los parámetros separados con `-h`, `-p`, `-U`, `-d`.

Ejecutar el script que crea las tablas (pedirá la contraseña):
```powershell
psql -h gastos-db-server.postgres.database.azure.com -p 5432 -U gastosadmin -d gastos_db -f "C:\ruta\a\tu\proyecto\backend\init.sql"
```

Reemplazar `C:\ruta\a\tu\proyecto` con la ruta real donde clonaste el repositorio. Ejemplo:
```powershell
psql -h gastos-db-server.postgres.database.azure.com -p 5432 -U gastosadmin -d gastos_db -f "C:\Users\cceci\Documents\Gastos\backend\init.sql"
```

Cuando pida contraseña escribir: `G4st0s#Prod2024!`

Resultado esperado:
```
CREATE TABLE
CREATE TABLE
```

Verificar que las tablas existen:
```powershell
psql -h gastos-db-server.postgres.database.azure.com -p 5432 -U gastosadmin -d gastos_db -c "\dt"
```

Resultado esperado:
```
        List of relations
 Schema | Name   | Type  | Owner
--------+--------+-------+-------------
 public | gastos | table | gastosadmin
 public | users  | table | gastosadmin
```

---

## PASO 7 — Construir y subir las imágenes Docker (terminal)

Este paso **requiere la terminal** porque Docker no tiene interfaz visual en el portal de Azure. Se empaqueta el código de la app en imágenes Docker y se suben al ACR del Paso 3.

> **¿Qué es una imagen Docker?** Es como un "empaquetado" del código con todo lo necesario para que corra: Node.js, las dependencias npm, los archivos del proyecto. Azure descarga ese paquete y lo ejecuta.

Abrir **PowerShell** en la carpeta del proyecto:

```powershell
# Login en Azure
az login

# Login al Container Registry (reemplazar con tu nombre de ACR)
az acr login --name "gastos<TUS-INICIALES>acr"
```

**Imagen del backend:**
```powershell
# Reemplazar gastos<TUS-INICIALES>acr con tu nombre real (ej: gastoscmacr)
docker build -t "gastos<TUS-INICIALES>acr.azurecr.io/gastos-backend:latest" ./backend
docker push "gastos<TUS-INICIALES>acr.azurecr.io/gastos-backend:latest"
```

El push puede tardar 1-2 minutos. Resultado esperado al final:
```
latest: digest: sha256:... size: ...
```

> **Pausa aquí.** El frontend necesita la URL del backend que obtendrás en el Paso 8.1. Vuelve aquí después de completar el Paso 8.1 para construir la imagen del frontend.

**Imagen del frontend** (completar DESPUÉS del Paso 8.1):
```powershell
# Reemplazar <URL-DEL-BACKEND> con la URL real obtenida en el Paso 8.1
# Ejemplo: https://gastos-backend.happywave-abc123.eastus.azurecontainerapps.io
docker build `
  --build-arg VITE_API_URL="https://<URL-DEL-BACKEND>" `
  -t "gastos<TUS-INICIALES>acr.azurecr.io/gastos-frontend:latest" `
  ./frontend

docker push "gastos<TUS-INICIALES>acr.azurecr.io/gastos-frontend:latest"
```

> **¿Por qué el frontend necesita la URL del backend en el build?**
> React usa Vite, que "hornea" las variables de entorno dentro del bundle JavaScript durante la compilación. Una vez compilado no se puede cambiar — por eso la URL del backend debe conocerse antes de construir la imagen.

---

## PASO 8 — Crear los Container Apps

Los Container Apps son los "servidores virtuales" donde corren las imágenes Docker que subiste en el Paso 7. Azure los escala automáticamente y les asigna una URL pública con HTTPS.

### 8.1 — Container App del Backend

1. En la **barra de búsqueda** escribir: `container apps`
2. Hacer clic en **Container Apps**
3. Hacer clic en **+ Crear**

**Pestaña Básico:**

| Campo | Valor |
|---|---|
| ➤ Suscripción | `Azure for Students` |
| ➤ Grupo de recursos | `rg-gastos-prod` |
| ➤ Nombre de la aplicación | `gastos-backend` |
| ➤ Región | `East US` |
| ➤ Entorno de Container Apps | Hacer clic en **Crear nuevo** |

**Ventana "Crear entorno":**
| Campo | Valor |
|---|---|
| ➤ Nombre del entorno | `gastos-env` |
| ➤ Región | `East US` |

Hacer clic en **Crear** (dentro de la ventana emergente).

4. Hacer clic en la pestaña **Contenedor**

**Pestaña Contenedor:**

- ➤ Desmarcar el checkbox **"Usar imagen de inicio rápido"** (si está marcado)

| Campo | Valor |
|---|---|
| ➤ Origen de imagen | `Azure Container Registry` |
| ➤ Registro | `gastos<TUS-INICIALES>acr` |
| ➤ Imagen | `gastos-backend` |
| ➤ Etiqueta de imagen | `latest` |

**Variables de entorno** — hacer clic en **+ Agregar** para cada una:

| Nombre | Valor |
|---|---|
| `PORT` | `3001` |
| `PGHOST` | `gastos-db-server.postgres.database.azure.com` |
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
| ➤ Entrada | ✅ Activar **"Habilitado"** |
| ➤ Tráfico de entrada | `Aceptar tráfico desde cualquier lugar` |
| ➤ Puerto de destino | `3001` |

6. Hacer clic en **Revisar y crear** → **Crear**
7. Cuando termine (~2 min), hacer clic en **Ir al recurso**
8. En la parte superior de la pantalla del recurso, copiar la **URL de la aplicación**

> La URL tiene esta forma: `gastos-backend.XXXXX.eastus.azurecontainerapps.io`
> **Copia solo el dominio, sin `https://`** — lo agregarás manualmente en el siguiente paso.
> **Guarda esta URL** — la necesitas para el Paso 7 (imagen del frontend) y Paso 8.3.

**Verificar que el backend funciona:**

Abrir el navegador y entrar a `https://<URL-DEL-BACKEND>/`. Debe mostrar:
```json
{"status":"ok","message":"API de Control de Gastos ✅"}
```

Si ves ese mensaje: el backend está corriendo y conectado a PostgreSQL correctamente.

---

### 8.2 — Volver al Paso 7 y construir la imagen del frontend

Ahora que tienes la URL del backend, regresa al **Paso 7** y ejecuta los comandos de la imagen del frontend con la URL real.

---

### 8.3 — Container App del Frontend

1. En **Container Apps**, hacer clic en **+ Crear**

**Pestaña Básico:**

| Campo | Valor |
|---|---|
| ➤ Suscripción | `Azure for Students` |
| ➤ Grupo de recursos | `rg-gastos-prod` |
| ➤ Nombre de la aplicación | `gastos-frontend` |
| ➤ Región | `East US` |
| ➤ Entorno | `gastos-env` ← seleccionar el que ya existe, **NO crear nuevo** |

2. Pestaña **Contenedor**:

- ➤ Desmarcar **"Usar imagen de inicio rápido"**

| Campo | Valor |
|---|---|
| ➤ Origen de imagen | `Azure Container Registry` |
| ➤ Registro | `gastos<TUS-INICIALES>acr` |
| ➤ Imagen | `gastos-frontend` |
| ➤ Etiqueta | `latest` |

3. Pestaña **Entrada**:

| Campo | Valor |
|---|---|
| ➤ Entrada | ✅ Habilitado |
| ➤ Tráfico | `Aceptar tráfico desde cualquier lugar` |
| ➤ Puerto de destino | `80` |

4. **Revisar y crear** → **Crear**
5. Hacer clic en **Ir al recurso**
6. Copiar la **URL de la aplicación** del frontend
7. Abrir esa URL en el navegador — debe cargar la app completa con la landing page

---

## PASO 9 — Configurar CI/CD con GitHub Actions

GitHub Actions despliega automáticamente cada vez que haces `git push`. El repositorio ya tiene los archivos de workflow en `.github/workflows/` — solo necesitas darle las credenciales de tu Azure.

### 9.1 — Crear el Service Principal (terminal)

El Service Principal es una "cuenta de servicio" de Azure que GitHub Actions usa para autenticarse de forma segura, sin usar tu contraseña personal.

```powershell
# Login en Azure si no está activo
az login

# Obtener el ID de tu suscripción
az account show --query id -o tsv
# Copia el ID que aparece (formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

# Crear el Service Principal (reemplazar <SUBSCRIPTION-ID> con el valor anterior)
az ad sp create-for-rbac `
  --name "github-actions-app-gastos" `
  --role contributor `
  --scopes /subscriptions/<SUBSCRIPTION-ID>/resourceGroups/rg-gastos-prod `
  --sdk-auth
```

El comando imprime un bloque JSON. **Copiar TODO el bloque completo** (desde `{` hasta `}`):
```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  ...
}
```

Dar permiso para subir imágenes al ACR:
```powershell
$SP_ID = az ad sp list --display-name "github-actions-app-gastos" --query "[0].appId" -o tsv
$ACR_ID = az acr show --name "gastos<TUS-INICIALES>acr" --query "id" -o tsv

az role assignment create `
  --assignee $SP_ID `
  --role AcrPush `
  --scope $ACR_ID
```

---

### 9.2 — Configurar los Secrets en GitHub

Los Secrets son variables privadas en GitHub — nunca aparecen en los logs de los workflows.

1. Ir a: **https://github.com/albertoamas/app-gastos/settings/secrets/actions**
2. Para cada secret: hacer clic en **New repository secret** → escribir el nombre → pegar el valor → **Add secret**

---

**Secret 1 — `AZURE_CREDENTIALS`**

- Nombre: `AZURE_CREDENTIALS`
- Valor: el bloque JSON completo del Service Principal (Paso 9.1)

*Para qué sirve:* Permite a GitHub Actions autenticarse en Azure para hacer los deployments.

---

**Secret 2 — `ACR_NAME`**

- Nombre: `ACR_NAME`
- Valor: el nombre de tu ACR — ejemplo: `gastoscmacr`

*Para qué sirve:* Nombre del Container Registry. El workflow lo usa para hacer `az acr login`.

---

**Secret 3 — `ACR_LOGIN_SERVER`**

- Nombre: `ACR_LOGIN_SERVER`
- Valor: el servidor de inicio de sesión de tu ACR — ejemplo: `gastoscmacr.azurecr.io`

*Para qué sirve:* URL completa del registry. Se usa como prefijo al etiquetar imágenes (`gastoscmacr.azurecr.io/gastos-backend:latest`).

---

**Secret 4 — `VITE_API_URL`**

- Nombre: `VITE_API_URL`
- Valor: la URL completa del backend con `https://` — ejemplo:
  ```
  https://gastos-backend.happywave-abc123.eastus.azurecontainerapps.io
  ```

*Para qué sirve:* Se inyecta como argumento de build del Docker del frontend para que Vite lo hornee en el bundle de React.

---

### 9.3 — Probar el CI/CD

Hacer un cambio pequeño y hacer push para confirmar que el pipeline se activa:

```powershell
# Desde la carpeta del proyecto
Add-Content -Path "frontend/src/pages/Landing.jsx" -Value ""
git add .
git commit -m "test: verificar CI/CD automatico"
git push origin main
```

Ir a **https://github.com/albertoamas/app-gastos/actions**

Debe aparecer el workflow **"Deploy Frontend"** con un ícono amarillo girando. Esperar ~3 minutos hasta que cambie a ✅ verde.

> Los workflows solo se activan cuando hay cambios en `backend/` o `frontend/`. Para probar el de backend, modifica cualquier archivo dentro de `backend/`.

---

## PASO 10 — Verificación final en el navegador

Abrir la URL del frontend y probar el flujo completo de la app:

| Acción | Resultado esperado |
|---|---|
| Abrir la URL del frontend | Carga la landing page |
| Clic en "Crear cuenta gratis" | Muestra el formulario de registro |
| Registrarse con nombre, email y contraseña | Redirige al dashboard |
| Agregar un gasto (monto + descripción + fecha) | Aparece en la lista inmediatamente |
| Ir a Historial | El gasto aparece en la tabla |
| Filtrar por mes | Solo muestra gastos del mes seleccionado |
| Cerrar sesión | Redirige a la landing page |
| Iniciar sesión | Los gastos anteriores siguen guardados |

Si todos los pasos funcionan: **el despliegue está completo** ✅

---

## Ver todos tus recursos en el portal

En cualquier momento puedes revisar el estado de todo:

1. Ir a **portal.azure.com**
2. Barra de búsqueda → escribir `rg-gastos-prod`
3. Hacer clic en el Resource Group
4. Verás la lista de todos los recursos:

```
gastos<TUS-INICIALES>acr     Container registry
gastos-db-server              Azure Database for PostgreSQL flexible server
gastos-env                    Container Apps Environment
gastos-backend                Container App
gastos-frontend               Container App
```

---

## Monitorear y depurar desde el portal

### Ver logs en tiempo real
1. Abrir el recurso `gastos-backend` (o `gastos-frontend`) en Container Apps
2. Menú izquierdo → **Supervisión → Flujo de registros**
3. Los logs aparecen en tiempo real — útil para ver errores de conexión a la DB

### Reiniciar un Container App
1. Abrir el recurso
2. Menú izquierdo → **Revisiones y réplicas**
3. Hacer clic en la revisión activa → **Reiniciar**

### Apagar para ahorrar crédito (cuando no uses la app)
1. Abrir `gastos-backend` → menú izquierdo → **Escalar y réplicas**
2. Cambiar **Réplicas mínimas** a `0` → **Guardar**
3. Repetir con `gastos-frontend`

Para volver a encender: cambiar a `1`.

> El PostgreSQL sigue corriendo aunque los Container Apps estén apagados. Para pausarlo, ir al recurso PostgreSQL → **Detener**.

---

## Eliminar todo al final del semestre

Para liberar el crédito cuando ya no necesites la app:

1. Ir a **portal.azure.com**
2. Barra de búsqueda → `rg-gastos-prod`
3. Abrir el Resource Group
4. Hacer clic en **Eliminar grupo de recursos**
5. Escribir `rg-gastos-prod` en el campo de confirmación
6. Hacer clic en **Eliminar**

Esto elimina **todos los recursos** (ACR, PostgreSQL, Container Apps) de una sola vez.

---

## Resumen de nombres de recursos

Completa esta tabla con tus valores reales antes de empezar — te ayudará a no perder los datos:

| Recurso | Nombre | URL / Valor |
|---|---|---|
| Resource Group | `rg-gastos-prod` | — |
| Container Registry | `gastos____acr` | `gastos____acr.azurecr.io` |
| PostgreSQL Server | `gastos-db-server` | `gastos-db-server.postgres.database.azure.com` |
| Backend Container App | `gastos-backend` | `https://gastos-backend.XXXXX.eastus.azurecontainerapps.io` |
| Frontend Container App | `gastos-frontend` | `https://gastos-frontend.XXXXX.eastus.azurecontainerapps.io` |

---

## Checklist

**Herramientas:**
- [ ] Docker Desktop instalado y corriendo (ícono ballena verde)
- [ ] psql instalado (`psql --version` funciona)
- [ ] Azure CLI instalado (`az --version` funciona)
- [ ] Repositorio clonado localmente

**Infraestructura Azure:**
- [ ] Paso 2 — Resource Group `rg-gastos-prod` creado en East US
- [ ] Paso 3 — Container Registry creado, admin user habilitado, credenciales anotadas
- [ ] Paso 4 — PostgreSQL `gastos-db-server` creado en **Brazil South**, estado: Disponible
- [ ] Paso 5 — Base de datos `gastos_db` creada dentro del servidor
- [ ] Paso 6 — Script `init.sql` ejecutado (tablas `users` y `gastos` verificadas)

**Docker:**
- [ ] Paso 7 — Imagen del backend construida y subida al ACR
- [ ] Paso 8.1 — Container App `gastos-backend` corriendo, URL anotada, health check OK
- [ ] Paso 7 (segunda parte) — Imagen del frontend construida con URL del backend y subida al ACR
- [ ] Paso 8.3 — Container App `gastos-frontend` corriendo, app visible en el navegador

**CI/CD:**
- [ ] Paso 9.1 — Service Principal `github-actions-app-gastos` creado, JSON copiado
- [ ] Paso 9.2 — 4 Secrets configurados en GitHub (`AZURE_CREDENTIALS`, `ACR_NAME`, `ACR_LOGIN_SERVER`, `VITE_API_URL`)
- [ ] Paso 9.3 — Push de prueba → workflow completado en verde ✅

**Verificación:**
- [ ] Paso 10 — Registro, login, agregar gasto, historial y cierre de sesión funcionan correctamente
