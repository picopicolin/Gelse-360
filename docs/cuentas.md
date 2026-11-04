# Subir Gelse Gestión a la nube (lo hace Pol)

Se usan las mismas cuentas que Picolín (GitHub **picopicolin**, Supabase y Vercel), con un proyecto nuevo en cada una.
Las contraseñas y claves **nunca** van por el chat: se pegan en `.env.local` (en el PC) o en Vercel.

## 1. GitHub: el repositorio
1. En github.com (cuenta picopicolin): **New repository** → nombre `gelse-gestion` → **Private** → sin README, sin .gitignore → Create.
2. Dime «repo creado» y lo subo yo.

## 2. Supabase: base de datos y archivos
1. En supabase.com: **New project** → nombre `gelse` → región **West EU (Ireland)** o **Central EU (Frankfurt)** → contraseña de base fuerte (guárdala en tu gestor).
2. Cuando esté creado, apunta tres cosas en `C:\Users\polga\GELSE 3d\gelse-gestion\.env.local`, al final:
   ```
   SUPABASE_DB_URL=<Connect → Transaction pooler: la dirección, puerto 6543, dejando [YOUR-PASSWORD] tal cual>
   SUPABASE_DB_PASSWORD=<la contraseña de la base>
   SUPABASE_URL=<Project Settings → Data API → Project URL>
   SUPABASE_SERVICE_ROLE_KEY=<Project Settings → API Keys → service_role (secret)>
   ```
3. Dime «Supabase hecho» y preparo la base (esquema, catálogo y almacén privado de planos).

## 3. Vercel: la web
1. En vercel.com: **Add New → Project** → importa `picopicolin/gelse-gestion`.
2. En **Environment Variables**, añade:
   | Nombre | Valor |
   |---|---|
   | `DATABASE_URL` | la misma que `SUPABASE_DB_URL` |
   | `DB_PASSWORD` | la contraseña de la base |
   | `SUPABASE_URL` | la de arriba |
   | `SUPABASE_SERVICE_ROLE_KEY` | la de arriba |
   | `SESSION_SECRET` | una clave nueva: en PowerShell `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` |
3. **Deploy**. Pásame la dirección (`https://….vercel.app`) y compruebo que funciona.

## 4. Vuestros usuarios
En PowerShell, dentro de la carpeta del proyecto (la contraseña la escribes tú en la terminal):
```
npm run nube:usuario -- pol "Pol García" direccion
npm run nube:usuario -- jose "José García" direccion
npm run nube:usuario -- sergio "Sergio" fabrica
```

## 5. Dominio (opcional, más adelante)
Por ejemplo `gestion.gelsecocinas.com`: Vercel → Settings → Domains, y un registro CNAME donde esté el dominio de Gelse.
