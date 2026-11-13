# Calendario de iPhone e iCloud

## Estado de entrega

La implementación agrega conexión directa con iCloud (CalDAV), elección de un calendario editable y sincronización de eventos en ambos sentidos. La clave de cifrado de producción se configuró en el proyecto Vercel que sirve `australwebstudio.online` (`austral-growth-zw`). No se guardó en Git.

**Base activada el 13 de noviembre de 2026:** se recuperó el acceso autorizado al proyecto AustralGrowth (`bwdenqwcgjxmvlizepgp`) y se aplicó la migración `add_icloud_calendar_sync`. Se verificaron ambas tablas con RLS activo y sin acceso SELECT para `anon` ni `authenticated`. No volver a ejecutar el script de creación en esta base.

El código detecta tablas ausentes y mantiene operativo el calendario local. Hasta completar la activación, el panel informa que iCloud aún no está habilitado y no pide la contraseña de Apple.

## Activación por el responsable

1. Para una instalación nueva, conectar Supabase con la cuenta/organización que tiene el proyecto y ejecutar una sola vez `prisma/icloud-setup.sql`. En **austral-growth-os** ya se ejecutó el 13/11/2026. El script agrega únicamente `ICloudConnection` e `ICloudObject`, índices y relaciones. No borra ni modifica eventos existentes.
2. Verificar la tabla, RLS y permisos. Ambas tablas son de uso exclusivo del servidor Prisma; no tienen acceso para `anon`, `authenticated` ni `PUBLIC`.
3. Confirmar que `CALENDAR_ENCRYPTION_KEY` está configurada en producción: 32 bytes aleatorios representados como 64 caracteres hexadecimales. Usar una clave exclusiva por base/entorno; no exponerla con prefijo `NEXT_PUBLIC_`. Cambiarla exige volver a autorizar las cuentas existentes.
4. Desplegar la versión y entrar en **Operaciones → Calendario → Conectar iCloud**.
5. En [Cuenta de Apple](https://account.apple.com), generar una contraseña específica de aplicación para AustralGrowth con doble factor activado. Introducirla **solo en el formulario HTTPS de AustralGrowth**, nunca en chats, issues, archivos del repositorio ni variables públicas. No usar la contraseña principal de Apple.
6. Elegir un calendario de iCloud editable y confirmar la zona horaria. Opcionalmente enviar los eventos anteriores de AustralGrowth (desmarcado inicialmente; las tareas no se envían). Si ya importaste un `.ics` manualmente, no marques esa opción para evitar duplicar esos eventos anteriores.
7. Crear un evento de prueba, esperar la sincronización y comprobarlo en iPhone. Editarlo en iPhone y comprobar la vuelta. Probar la eliminación en ambas direcciones únicamente con ese evento de prueba. Revocar la contraseña desde Apple si se deja de usar la integración.

Los eventos deben pertenecer a iCloud. Un evento almacenado solo en el teléfono o en una cuenta Google/Outlook agregada a la app Calendario no pertenece a esta conexión.

## Comportamiento

- Una cuenta Apple y un calendario por usuario de AustralGrowth, aislados por usuario y workspace.
- Nuevos eventos sincronizados de forma predeterminada cuando iCloud está conectado. Se puede desmarcar al crear. Los eventos locales anteriores permanecen locales salvo selección explícita.
- Las tareas siguen siendo propias de AustralGrowth: no son Recordatorios de Apple.
- Actualización al abrir la sección Calendario, cada minuto mientras esté visible, al volver a la pestaña y después de cambios locales. Reintentos con espera mínima para no saturar Apple.
- El cron diario `/api/cron/calendar-sync` actualiza una conexión por invocación (la menos recientemente intentada), adecuado para la cuenta personal de esta agencia. No se promete sincronización instantánea con la plataforma cerrada. Para equipos con varias cuentas o más frecuencia, ampliar la ejecución de fondo y la cola según el plan de hosting.
- Series simples diarias, semanales o mensuales: edición sobre toda la serie. Invitados, excepciones, reglas avanzadas, alarmas especiales o textos demasiado largos quedan en modo lectura y se editan desde iPhone. El iCalendar original se conserva para mostrar fechas, zonas y excepciones sin simplificarlas.
- Los cambios simultáneos conservan la versión iCloud en el evento vinculado y guardan la versión local como un evento independiente con el sufijo “(copia local)”. No se envía automáticamente esa copia a Apple.
- Las eliminaciones locales quedan en una cola persistente hasta confirmar la eliminación condicional en Apple. Un listado incompleto o un error de red nunca se interpreta como calendario vacío.
- Reintentos de creación reutilizan la URL y UID asignados, evitando duplicados después de una respuesta perdida. Escrituras con `If-Match` o `If-None-Match` evitan sobrescribir una versión desconocida.
- Desconectar borra la contraseña cifrada y detiene el acceso, manteniendo los eventos y relaciones para reanudar con la misma cuenta/calendario. Cambiar de cuenta o de calendario cuando ya hay eventos vinculados requiere una migración explícita; la interfaz lo bloquea.
- Límites: 2000 recursos VEVENT por calendario, 256 KB por recurso, 8 MB por respuesta y 500 eventos locales por envío inicial. Los trabajos largos continúan en el siguiente intento. Series de frecuencia por segundo/minuto/hora se rechazan.

## Seguridad y validación

Autorización de sesión con Supabase `getUser`; cada operación filtra usuario y workspace. Secretos AES-256-GCM con AAD vinculada al usuario. Las credenciales no se serializan al navegador ni a logs. Red restringida a `caldav.icloud.com` y shards `pNN-caldav.icloud.com`, con HTTPS, controles de redirección y pertenencia a la colección, límites de respuesta y rechazo de DTD/entidades XML. Bloqueo con lease evita sincronizaciones concurrentes y protege las ediciones locales mientras se aplican cambios.

Verificación realizada: compilación de producción con credenciales públicas ficticias; TypeScript; 25 pruebas en Argentina y Nueva York sobre cifrado, protocolo CalDAV simulado, reglas de fechas, conflictos, cola de reintentos y eliminaciones. No hubo acceso a una cuenta Apple real. Posteriormente se activó la base de AustralGrowth y se verificaron tablas y permisos de lectura; la prueba de escritura temporal no se ejecutó porque venció la confirmación nativa. La prueba completa con iPhone queda pendiente de la autorización personal de Apple. La prueba visual local se intentó, pero Chromium no pudo crear su socket por las restricciones del entorno (`Operation not permitted`); no se declara QA visual aprobada.

```sh
npm ci
npx prisma generate
npx tsc --noEmit
TZ=America/Argentina/Buenos_Aires node --import tsx --test tests/calendar.test.ts tests/icloud.test.ts tests/icloud-sync.test.ts
TZ=America/New_York node --import tsx --test tests/calendar.test.ts tests/icloud.test.ts tests/icloud-sync.test.ts
npm run build
```

La API conserva la ruta local sin depender de que existan las nuevas tablas. La cuenta Apple nunca debe autorizarse antes de activar y verificar las tablas y el entorno de producción.
