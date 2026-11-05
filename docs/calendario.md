# Calendario de AustralGrowth

Nueva sección `/calendario`, accesible desde Operaciones. Conserva las superficies oscuras, el acento naranja y los componentes de formulario existentes. No requiere nuevas dependencias ni credenciales de Google.

## Funciones

- Vistas de mes, semana, día y agenda de 30 días, con navegación y botón Hoy.
- Crear, editar y eliminar eventos y tareas; marcar tareas completadas.
- Inicio y fin, actividades de varios días y de día completo (fin exclusivo).
- Notas, ubicación/enlace, cinco colores y filtros por texto/tipo/completadas.
- Repetición diaria, semanal o mensual, con fecha de fin opcional. Los meses sin el día original se omiten.
- Arrastrar a otra fecha/hora; en móvil se puede editar fecha y duración desde el formulario.
- Recordatorios dentro de toda la aplicación abierta, consultados cada 15 segundos y datos actualizados cada minuto.
- Exportación `.ics` con series y avisos para importar en otros calendarios.
- Calendario personal: cada registro pertenece al usuario y al workspace. Las rutas verifican la identidad con Supabase Auth y filtran ambos identificadores en lectura y escritura.

Los horarios se muestran en la zona del navegador. Una misma serie recurrente se interpreta según la zona local al verla; no hay selector de zona independiente. La exportación usa UTC para los eventos con hora: al importar series en una zona con cambios estacionales, el servicio receptor puede conservar la hora UTC.

Editar, mover, completar o eliminar una actividad recurrente afecta toda la serie, con aviso visible. No se implementan excepciones por ocurrencia, invitados, disponibilidad compartida, videollamadas automáticas ni sincronización bidireccional con Google. Los recordatorios son avisos dentro de la aplicación: no llegan por correo/push ni con la plataforma cerrada.

## Activación

1. Confirmar que la base conectada a las variables `DATABASE_URL` y `DIRECT_URL` de este repositorio es la base de AustralGrowth. En el proyecto `austral-growth-os`, la activación fue autorizada y completada el 5 de noviembre de 2026.
2. Revisar y ejecutar **una sola vez** `prisma/calendar-setup.sql` en esa base, antes de desplegar la rama. Es SQL aditivo: crea únicamente `CalendarEvent`, sus índices y claves foráneas, sin modificar ni borrar tablas existentes.
3. La tabla usa RLS y revoca acceso directo a `anon`/`authenticated`/`PUBLIC`. Prisma debe conectarse con el rol servidor existente que pueda acceder a sus registros (por ejemplo `postgres`); no exponer esa conexión al navegador. No se crean políticas de acceso desde la API REST pública.
4. Desplegar la rama con las variables existentes. El script de build ejecuta `prisma generate` para generar el nuevo cliente. No usar `db:seed` ni resetear la base existente.
5. Abrir Calendario, crear una tarea con aviso, recargar para comprobar persistencia, editarla y completarla. Verificar aislamiento con una segunda cuenta y comprobar que un usuario sin sesión recibe 401 en la API.

El repositorio usa `prisma db push` para su esquema actual y no contiene historial de migraciones. Por eso se entrega un script explícito de instalación, sin introducir un historial parcial de Prisma Migrate. Las restricciones SQL y RLS son adicionales al esquema Prisma y deben conservarse al actualizar la base.

## Validación

```sh
npm ci
npx prisma generate
npx tsc --noEmit
TZ=America/Argentina/Buenos_Aires node --import tsx --test tests/calendar.test.ts
TZ=America/New_York node --import tsx --test tests/calendar.test.ts
npm run build
```

El build necesita las variables públicas Supabase existentes; se usaron valores ficticios únicamente para compilar en el entorno de desarrollo sin credenciales. Se verificó creación, lectura, actualización y eliminación contra la base de producción dentro de una transacción revertida, sin dejar datos de prueba. Se confirmó RLS activo y ausencia de permiso SELECT directo para anon/authenticated. No se probó una sesión real del navegador.
