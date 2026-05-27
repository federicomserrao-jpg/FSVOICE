# FSVOICE – Car One

Sistema CRM de gestión de encuestas CSAT para Car One.  
Desarrollado por MERA Solutions.

---

## Stack

- **Next.js 14** (App Router)
- **Supabase** (base de datos + autenticación)
- **Tailwind CSS**
- **Vercel** (deploy)

---

## Instalación local

### 1. Clonar / descomprimir el proyecto

```bash
cd fsvoice-carone
npm install
```

### 2. Configurar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
   - Name: `fsvoice-carone`
   - Region: South America (São Paulo)

2. Ejecutar el schema SQL:
   - Ir a Supabase → SQL Editor
   - Pegar el contenido de `/supabase/schema.sql`
   - Click en Run

3. Copiar las credenciales:
   - Supabase → Project Settings → API
   - Copiar `Project URL` y `anon public key`

### 3. Variables de entorno

Crear el archivo `.env.local` en la raíz del proyecto:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### 4. Levantar el proyecto

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Primer uso

### Crear el primer usuario admin

1. Ir a Supabase → Authentication → Users → Add user
2. Completar email y contraseña
3. En SQL Editor ejecutar:
```sql
UPDATE public.perfiles SET rol = 'admin', nombre = 'Tu Nombre' WHERE email = 'tu@email.com';
```

### Crear operadores

Ingresar con el usuario admin → Gestión admin → Usuarios → Crear nuevo usuario.

### Importar clientes

**Opción A:** Supabase → Table Editor → clientes → Import data (CSV)

**Opción B:** Script Python:
```bash
cd supabase
pip install supabase pandas
# Editar SUPABASE_URL y SUPABASE_KEY en import_clientes.py
python import_clientes.py --file clientes.csv
```

**Columnas del CSV:**
`nombre, apellido, dni, email, email_alternativo, telefono, telefono_alternativo, direccion, ciudad, provincia, concesionaria, marca, modelo, version, anio, patente, fecha_compra`

---

## Deploy en Vercel

```bash
npm install -g vercel
vercel
```

Agregar las variables de entorno en Vercel → Settings → Environment Variables.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── login/          → Pantalla de login
│   ├── dashboard/      → Lista de clientes + gestión
│   ├── metricas/       → Dashboard de métricas con filtro por fecha
│   └── admin/          → Panel admin (usuarios + clientes)
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx
│   └── ui/
│       ├── ClientesList.tsx    → Tabla de clientes con filtros
│       ├── GestionModal.tsx    → Formulario de gestión (3 pasos)
│       ├── MetricasDashboard.tsx
│       └── AdminPanel.tsx
├── lib/
│   ├── supabase.ts             → Cliente browser
│   └── supabase-server.ts      → Cliente server (SSR)
└── types/
    └── index.ts                → Tipos TypeScript
supabase/
├── schema.sql                  → Script SQL completo
└── import_clientes.py          → Importador CSV
```

---

## Funcionalidades

- ✅ Login con roles (operador / admin)
- ✅ Lista de clientes con filtros por estado y búsqueda
- ✅ Formulario de gestión en 3 pasos con validaciones
- ✅ 6 estados: Encuestado, Fin de gestión, No acepta encuesta, Rellamar, Pendiente, No es titular
- ✅ Validación campo por campo con corrección inline
- ✅ Campos "No" solo habilitan corrección en email y teléfono por defecto
- ✅ Botonera de llamada (tel:) y mail (mailto:) con números alternativos
- ✅ Historial de cambios con fecha, operador y valores anterior/nuevo
- ✅ Dashboard de métricas con filtro de fecha personalizable
- ✅ Panel admin: creación de usuarios y visualización de clientes
- ✅ Importación de clientes vía CSV

---

*FSVOICE – Car One · MERA Solutions*
