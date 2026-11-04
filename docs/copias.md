# Copias de seguridad

Hay dos copias, que se complementan:

| Copia | Qué lleva | Cómo se hace | Para qué sirve |
|---|---|---|---|
| **Completa** | Toda la base de datos + todos los archivos (planos, fotos) | `npm run backup -- --nube` en el PC (o sola cada día, ver abajo) | Volver a montar la web entera si algo se rompe |
| **Excel** | Todos los datos, una hoja por tabla (sin contraseñas ni planos) | Web → Registro → «Descargar copia en Excel» | Tener los datos a mano y leerlos sin la web |

La copia completa se guarda en `OneDrive\Copias de seguridad\Gelse` (así también queda en la nube de Microsoft):
- `base de datos\gelse-nube-AAAA-MM-DD_HH-MM.dump`: una por día, no se borran las antiguas.
- `archivos\`: los planos y fotos; solo se copian los nuevos.
- `registro de copias.txt`: una línea por copia hecha.

## Hacerla cada día sola (cuando la web esté en la nube)

En PowerShell, una vez (crea una tarea de Windows que la hace a las 21:00):

```
schtasks /Create /TN "Gelse copia" /SC DAILY /ST 21:00 /TR "cmd /c cd /d \"C:\Users\polga\GELSE 3d\gelse-gestion\" && npm run backup -- --nube >> \"C:\Users\polga\OneDrive\Copias de seguridad\Gelse\ultima-salida.txt\" 2>&1"
```

Hace falta que el PC esté encendido a esa hora; si no, se hace la siguiente vez. Para comprobar que funciona, mira la última línea de `registro de copias.txt`.

## Restaurar

1. Crear una base vacía (en Supabase: un proyecto nuevo; en local: `create database gelse_restaurada`).
2. Cargar la copia:
   ```
   "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" --no-owner --no-privileges -d "<dirección de la base nueva>" "<archivo .dump>"
   ```
3. Subir la carpeta `archivos\` al almacén (bucket `archivos`, cada archivo dentro de una carpeta con sus 2 primeras letras).
4. Cambiar `DATABASE_URL` en Vercel a la base nueva.

Probado el 04/11/2026 en local: la copia restaurada tenía exactamente los mismos datos que la original.
