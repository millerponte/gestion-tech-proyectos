# GestTech — Plataforma de Gestión de Proyectos

Sistema de gestión de proyectos y entregables para **Okinawatec**, **Tech Solutions** y **Quantic**.

## Stack
- **Next.js 14** (App Router)
- **Firebase** (Auth + Firestore)
- **Tailwind CSS**
- **TypeScript**
- **Vercel** (deploy)

## Instalación local

```bash
npm install
```

Crea el archivo `.env.local` con tus credenciales de Firebase (ya incluido con los valores reales).

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Deploy en Vercel

1. Sube este repositorio a GitHub
2. Conecta el repo en [vercel.com](https://vercel.com)
3. Agrega las variables de entorno de `.env.local` en Vercel → Settings → Environment Variables
4. Deploy automático ✅

## Estructura

```
src/
├── app/              # Páginas (App Router)
│   ├── auth/         # Login y registro
│   ├── dashboard/    # Calendario + pendientes
│   ├── proyectos/    # Lista de proyectos
│   ├── entregables/  # Registro de entregables
│   ├── cronogramas/  # Hitos por proyecto
│   └── admin/        # Panel administrador
├── components/       # Componentes reutilizables
├── hooks/            # useAuth
├── lib/              # Firebase + helpers DB
└── types/            # TypeScript types
```

## Roles
- **Admin**: acceso total + panel de administración
- **Usuario**: puede registrar y ver entregables
- **Visitante**: solo lectura

## Numeración automática de documentos
- TECH SOLUTIONS → `RPTS-XXXXX` / `Cargo XXXXX-ZRIX`  
- QUANTIC → `QT-XXXXX` / `Cargo XXXXX-QTO`  
- OKINAWATEC → `ITOK-XXXXX` / `Cargo XXXXX-OK-TEC`
