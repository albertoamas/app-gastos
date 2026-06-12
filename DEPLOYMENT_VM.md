# Guía de Despliegue con Máquina Virtual — App-Gastos en Azure

> Esta guía despliega App-Gastos usando una **Máquina Virtual (VM) Ubuntu** en Azure con Docker. La VM corre los contenedores del frontend y backend. PostgreSQL sigue como servicio administrado de Azure.

---

## Arquitectura

```
Navegador
    │
    ▼
Máquina Virtual Azure (Ubuntu 22.04)
IP Pública Estática: <VM-IP>
┌──────────────────────────────────────┐
│  gastos-frontend (nginx) → puerto 80 │
│  gastos-backend (Node.js) → puerto 3001│
│  Docker Compose orquesta ambos       │
└──────────────────────────────────────┘
    │
    ▼
Azure PostgreSQL Flexible Server
(gastos-db-server — Chile Central)

─────────────────────────────────────
git push → GitHub Actions
  → Build imágenes Docker
  → Push al ACR (gastoscmacr)
  → SSH a la VM
  → docker compose pull + up
```

---

## Recursos necesarios

| Recurso | Nombre | Estado |
|---|---|---|
| Resource Group | `rg-gastos-prod` | ✅ Ya existe |
| Container Registry | `gastos<TUS-INICIALES>acr` | ✅ Ya existe |
| PostgreSQL Server | `gastos-db-server` | ✅ Ya existe con tablas |
| **Máquina Virtual** | `gastos-vm` | ⬜ Crear en esta guía |

---

## PASO 1 — Crear la Máquina Virtual

1. En la **barra de búsqueda** de Azure Portal escribir: `máquinas virtuales`
2. Hacer clic en **Máquinas virtuales**
3. Hacer clic en **+ Crear** → **Máquina virtual de Azure**

### Pestaña Básico

**Detalles del proyecto:**

| Campo | Valor |
|---|---|
| ➤ Suscripción | `Azure for Students` |
| ➤ Grupo de recursos | `rg-gastos-prod` |

**Detalles de instancia:**

| Campo | Valor |
|---|---|
| ➤ Nombre de máquina virtual | `gastos-vm` |
| ➤ Región | `East US` |
| ➤ Opciones de disponibilidad | `No se requiere redundancia` |
| ➤ Imagen | `Ubuntu Server 22.04 LTS` |
| ➤ Tamaño | Hacer clic en **Ver todos los tamaños** → buscar y seleccionar `B2s` (2 vCPU, 4 GiB RAM) |

**Cuenta de administrador:**

| Campo | Valor |
|---|---|
| ➤ Tipo de autenticación | `Clave pública SSH` |
| ➤ Nombre de usuario | `azureuser` |
| ➤ Nombre del par de claves | `gastos-vm-key` |

> Azure generará automáticamente la clave SSH. Al crear la VM te pedirá descargar el archivo `.pem` — **descárgalo y guárdalo**, es la única forma de conectarte a la VM.

**Reglas de puerto de entrada:**

| Campo | Valor |
|---|---|
| ➤ Puertos de entrada públicos | `Permitir los puertos seleccionados` |
| ➤ Seleccionar puertos de entrada | `SSH (22)`, `HTTP (80)` |

4. Hacer clic en la pestaña **Redes**

### Pestaña Redes

**IP pública — configurar como estática** (importante: si es dinámica cambia al reiniciar):

1. En el campo **IP pública**, hacer clic en **Crear nueva**
2. Nombre: `gastos-vm-ip`
3. ➤ **SKU**: `Estándar`
4. ➤ **Asignación**: `Estática`
5. Hacer clic en **Aceptar**

**Agregar puerto 3001 al NSG:**

1. En **Grupo de seguridad de red de NIC** seleccionar `Avanzado`
2. Hacer clic en **Crear nuevo**
3. En la ventana del NSG, hacer clic en **+ Agregar una regla de entrada**:

| Campo | Valor |
|---|---|
| ➤ Intervalos de puertos de destino | `3001` |
| ➤ Protocolo | `TCP` |
| ➤ Acción | `Permitir` |
| ➤ Prioridad | `310` |
| ➤ Nombre | `Allow-3001` |

4. Hacer clic en **Agregar** → **Aceptar**

5. Hacer clic en **Revisar y crear** → **Crear**

> La VM tarda ~2 minutos en crearse. Cuando aparezca el botón **Descargar clave privada y crear recurso**, hacer clic para descargar el archivo `gastos-vm-key.pem`. **No pierdas este archivo.**

6. Hacer clic en **Ir al recurso**
7. Anotar la **Dirección IP pública** que aparece en la pantalla — ejemplo: `20.55.123.45`

---

## PASO 2 — Agregar IP de la VM al firewall de PostgreSQL

La VM necesita permiso para conectarse a la base de datos.

1. En Azure Portal buscar `gastos-db-server`
2. Menú izquierdo → **Configuración → Redes**
3. En **Reglas de firewall**, hacer clic en **+ Agregar regla de firewall actual del cliente**

   O agregar manualmente:
   - Nombre: `AllowVM`
   - IP inicial: `<IP-PUBLICA-DE-LA-VM>`
   - IP final: `<IP-PUBLICA-DE-LA-VM>`

4. Hacer clic en **Guardar**

---

## PASO 3 — Conectarse a la VM por SSH

Abrir **PowerShell** en la carpeta donde descargaste el `.pem`:

```powershell
# Dar permisos correctos al archivo de clave (solo la primera vez)
icacls "gastos-vm-key.pem" /inheritance:r /grant:r "$($env:USERNAME):(R)"

# Conectarse a la VM
ssh -i "gastos-vm-key.pem" azureuser@<IP-PUBLICA-DE-LA-VM>
```

Reemplazar `<IP-PUBLICA-DE-LA-VM>` con la IP del Paso 1. Ejemplo:
```powershell
ssh -i "gastos-vm-key.pem" azureuser@20.55.123.45
```

Si pregunta `Are you sure you want to continue connecting?` escribir `yes`.

Resultado esperado — verás el prompt de Ubuntu:
```
azureuser@gastos-vm:~$
```

---

## PASO 4 — Instalar Docker en la VM

Ejecutar estos comandos **dentro de la VM** (en la sesión SSH):

```bash
# Actualizar paquetes
sudo apt update && sudo apt upgrade -y

# Instalar Docker con el script oficial
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar el usuario al grupo docker (evita usar sudo en cada comando)
sudo usermod -aG docker azureuser

# Instalar Docker Compose plugin
sudo apt install docker-compose-plugin -y

# Aplicar el nuevo grupo sin cerrar sesión
newgrp docker
```

Verificar instalación:
```bash
docker --version
docker compose version
```

Resultado esperado:
```
Docker version 27.x.x
Docker Compose version v2.x.x
```

---

## PASO 5 — Crear la estructura de la app en la VM

Dentro de la VM, crear la carpeta del proyecto y el archivo de configuración:

```bash
# Crear carpeta del proyecto
mkdir -p /home/azureuser/app
cd /home/azureuser/app
```

Crear el archivo `.env` con las variables de entorno:
```bash
cat > /home/azureuser/app/.env << 'EOF'
PGHOST=gastos-db-server.postgres.database.azure.com
PGPORT=5432
PGUSER=gastosadmin
PGPASSWORD=G4st0s#Prod2024!
PGDATABASE=gastos_db
PGSSL=true
JWT_SECRET=j8Kx2mNpQ5vRwY9zAcFhLtBuDeGiJoMs
NODE_ENV=production
EOF
```

Crear el archivo `docker-compose.prod.yml`:

> Reemplazar `gastos<TUS-INICIALES>acr` con tu nombre real de ACR (ejemplo: `gastoscmacr`)
> Reemplazar `<IP-PUBLICA-DE-LA-VM>` con la IP real de tu VM

```bash
cat > /home/azureuser/app/docker-compose.prod.yml << 'EOF'
services:
  backend:
    image: gastoscmacr.azurecr.io/gastos-backend:latest
    container_name: gastos-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    env_file:
      - .env
    networks:
      - gastos_net

  frontend:
    image: gastoscmacr.azurecr.io/gastos-frontend:latest
    container_name: gastos-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - gastos_net

networks:
  gastos_net:
    driver: bridge
EOF
```

---

## PASO 6 — Login al ACR desde la VM

Para que la VM pueda descargar las imágenes Docker del ACR:

```bash
# Instalar Azure CLI en la VM
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login al ACR con credenciales admin
# Reemplazar con tu ACR name, username y password (del Paso 3 de DEPLOYMENT_VISUAL.md)
docker login gastoscmacr.azurecr.io -u gastoscmacr -p <PASSWORD-DEL-ACR>
```

Resultado esperado:
```
Login Succeeded
```

---

## PASO 7 — Construir y subir imágenes Docker (desde tu PC)

Cerrar la sesión SSH (`exit`) y volver a **PowerShell en tu PC**, en la carpeta del proyecto:

```powershell
# Login en Azure y al ACR
az login
az acr login --name "gastos<TUS-INICIALES>acr"
```

**Imagen del backend:**
```powershell
docker build -t "gastos<TUS-INICIALES>acr.azurecr.io/gastos-backend:latest" ./backend
docker push "gastos<TUS-INICIALES>acr.azurecr.io/gastos-backend:latest"
```

**Imagen del frontend** (usar la IP pública de la VM):
```powershell
# Reemplazar <IP-PUBLICA-DE-LA-VM> con la IP real, ejemplo: 20.55.123.45
docker build `
  --build-arg VITE_API_URL="http://<IP-PUBLICA-DE-LA-VM>:3001" `
  -t "gastos<TUS-INICIALES>acr.azurecr.io/gastos-frontend:latest" `
  ./frontend

docker push "gastos<TUS-INICIALES>acr.azurecr.io/gastos-frontend:latest"
```

---

## PASO 8 — Levantar la app en la VM

Reconectarse a la VM por SSH:
```powershell
ssh -i "gastos-vm-key.pem" azureuser@<IP-PUBLICA-DE-LA-VM>
```

Dentro de la VM, descargar las imágenes y levantar los contenedores:
```bash
cd /home/azureuser/app

# Descargar las imágenes del ACR
docker compose -f docker-compose.prod.yml pull

# Levantar los contenedores en segundo plano
docker compose -f docker-compose.prod.yml up -d
```

Verificar que los contenedores están corriendo:
```bash
docker compose -f docker-compose.prod.yml ps
```

Resultado esperado:
```
NAME              STATUS          PORTS
gastos-backend    Up              0.0.0.0:3001->3001/tcp
gastos-frontend   Up              0.0.0.0:80->80/tcp
```

**Verificar el backend:**
```bash
curl http://localhost:3001/
```

Resultado esperado:
```json
{"status":"ok","message":"API de Control de Gastos ✅"}
```

**Verificar desde el navegador:**
- App: `http://<IP-PUBLICA-DE-LA-VM>`
- API: `http://<IP-PUBLICA-DE-LA-VM>:3001`

---

## PASO 9 — Configurar CI/CD con GitHub Actions

El CI/CD para VM funciona diferente a Container Apps: en lugar de `az containerapp update`, GitHub Actions hace SSH a la VM y ejecuta `docker compose pull && up`.

### 9.1 — Preparar la clave SSH para GitHub

En **PowerShell en tu PC**, mostrar el contenido del archivo `.pem`:
```powershell
Get-Content "gastos-vm-key.pem"
```

Copiar **todo el contenido** incluyendo las líneas `-----BEGIN` y `-----END`.

### 9.2 — Configurar Secrets en GitHub

Ir a: **https://github.com/albertoamas/app-gastos/settings/secrets/actions**

Agregar estos secrets (además de los que ya existen):

---

**Secret: `VM_HOST`**
- Valor: la IP pública de la VM — ejemplo: `20.55.123.45`
- *Para qué sirve:* Dirección a la que GitHub Actions se conecta por SSH

---

**Secret: `VM_USER`**
- Valor: `azureuser`
- *Para qué sirve:* Usuario SSH de la VM

---

**Secret: `VM_SSH_KEY`**
- Valor: el contenido completo del archivo `gastos-vm-key.pem`
- *Para qué sirve:* Clave privada SSH para autenticarse en la VM

---

**Actualizar Secret: `VITE_API_URL`**
- Valor: `http://<IP-PUBLICA-DE-LA-VM>:3001`
- Ejemplo: `http://20.55.123.45:3001`
- *Nota:* Cambiar el valor anterior (que tenía la URL de Container Apps) por la IP de la VM

---

**Secret: `ACR_PASSWORD`**
- Valor: la contraseña del ACR (la que anotaste en el Paso 3 de DEPLOYMENT_VISUAL.md)
- *Para qué sirve:* Permite que la VM haga login al ACR durante el deploy automático

---

### 9.3 — Actualizar los workflows de GitHub Actions

Los workflows actuales usan `az containerapp update`. Hay que reemplazarlos con el enfoque SSH.

Los archivos ya están actualizados en el repositorio — el Paso 9.4 hace el push.

### 9.4 — Probar el CI/CD

```powershell
# Desde la carpeta del proyecto en tu PC
Add-Content -Path "frontend/src/pages/Landing.jsx" -Value ""
git add .
git commit -m "test: verificar CI/CD con VM"
git push origin main
```

Ir a **https://github.com/albertoamas/app-gastos/actions** — debe aparecer el workflow ejecutándose. Al terminar, la app en `http://<IP-VM>` debe reflejar el cambio.

---

## Comandos útiles dentro de la VM

```bash
# Ver contenedores corriendo
docker compose -f /home/azureuser/app/docker-compose.prod.yml ps

# Ver logs del backend en tiempo real
docker logs gastos-backend -f

# Ver logs del frontend
docker logs gastos-frontend -f

# Reiniciar todos los contenedores
docker compose -f /home/azureuser/app/docker-compose.prod.yml restart

# Apagar contenedores (la VM sigue corriendo pero sin app)
docker compose -f /home/azureuser/app/docker-compose.prod.yml down

# Actualizar manualmente sin CI/CD
docker compose -f /home/azureuser/app/docker-compose.prod.yml pull
docker compose -f /home/azureuser/app/docker-compose.prod.yml up -d
```

---

## Apagar la VM para ahorrar crédito

La VM cobra **aunque esté sin usar**. Cuando no necesites la app:

**Desde Azure Portal:**
1. Buscar `gastos-vm`
2. Hacer clic en **Detener**
3. Confirmar → la VM se detiene y deja de cobrar por CPU/RAM

Para volver a encender: botón **Iniciar**.

> La IP estática sigue cobrando un monto mínimo (~$3/mes) aunque la VM esté detenida. Para costo cero total, eliminar la IP pública cuando no la uses.

---

## Checklist

- [ ] Paso 1 — VM `gastos-vm` creada (Ubuntu 22.04, B2s, IP estática anotada)
- [ ] Paso 1 — Archivo `gastos-vm-key.pem` descargado y guardado
- [ ] Paso 1 — Puertos 22, 80 y 3001 abiertos en el NSG
- [ ] Paso 2 — IP de la VM agregada al firewall de PostgreSQL
- [ ] Paso 3 — Conexión SSH exitosa (`azureuser@gastos-vm:~$`)
- [ ] Paso 4 — Docker y Docker Compose instalados en la VM
- [ ] Paso 5 — Carpeta `/home/azureuser/app` creada con `.env` y `docker-compose.prod.yml`
- [ ] Paso 6 — Login al ACR exitoso desde la VM
- [ ] Paso 7 — Imágenes del backend y frontend subidas al ACR
- [ ] Paso 8 — Contenedores corriendo en la VM, app visible en `http://<IP-VM>`
- [ ] Paso 9.1/9.2 — Secrets de GitHub configurados (VM_HOST, VM_USER, VM_SSH_KEY, ACR_PASSWORD, VITE_API_URL actualizado)
- [ ] Paso 9.4 — CI/CD probado con un push, workflow completado en verde ✅
