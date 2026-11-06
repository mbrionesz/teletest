# Órbita TV

Primera versión de un inicio ligero para Samsung Tizen. Nombre provisional.
HTML, CSS y JavaScript sin frameworks. El clima opcional consulta por HTTPS la fuente DMC.

Incluye favoritos, biblioteca, ocultar apps, temas, movimiento opcional y reloj.
Los cambios se guardan localmente. Ocultar no desinstala ni detiene otras apps.
No modifica firmware, sustituye Smart Hub ni intercepta Home.

## Desarrollo

Desde `/workspace/teletest`:

```sh
python -m http.server 8080 --bind 127.0.0.1 --directory app
```

Fuera del televisor se muestran aplicaciones de demostración identificadas como tales.
Para comprobar los flujos, con Playwright y Chromium disponibles:

```sh
node tests/browser.cjs
python scripts/package.py
```

La prueba inicia su propio servidor en un puerto libre, genera `artifacts/home.png`
y simula la frontera de las APIs Tizen. No sustituye una prueba física.
El paquete `artifacts/Orbita-TV-0.1.0-unsigned.wgt` NO está firmado.

## Instalación pendiente de verificación en el QN70F

1. PC y TV en la misma red. Habilitar Developer Mode y autorizar la IP del PC.
2. Instalar Tizen Studio, TV Extension y Samsung Certificate Extension.
3. Conectar con Device Manager y crear un perfil Samsung que incluya el DUID del TV.
   Las claves y certificados permanecen en el computador del propietario.
4. Importar `app/` como proyecto web Tizen, seleccionar el perfil y ejecutar en el TV.
   Alternativamente, usar el CLI Tizen desde la raíz:

```sh
tizen package -t wgt -s NOMBRE_DEL_PERFIL -- app
tizen install -n RUTA_DEL_WGT_FIRMADO -t NOMBRE_DEL_DISPOSITIVO
```

Usar la ruta real del paquete producido por Tizen Studio. La firma y permisos del
firmware determinan la disponibilidad de las APIs. No hay un SDK Tizen instalado
ni un televisor conectado en este entorno: firma e instalación no se han probado.

## Rendimiento y controles

Sin vídeo de fondo, desenfoques, frameworks ni servicios vigilantes. Se consultan
las apps al iniciar, regresar a primer plano y actualizar manualmente. El reloj
se actualiza cada minuto y se suspende al ocultar la app. Movimiento desactivable.
No se prometen mejoras del sistema ni cifras de RAM/CPU sin medición del modelo.

Flechas, OK y Atrás del mando Samsung son la referencia. El mando Apple TV depende
de qué eventos transmita el conjunto por HDMI-CEC; no se garantiza control inverso.
Se deben probar ambos mandos y el regreso desde apps externas en el televisor.

El adaptador Tizen toma como referencia HorizonX (MIT), ver `LICENSE-HorizonX`.
La interfaz es independiente; no se incluyen sus servicios experimentales de Home.

## Versión 0.2.0

- Acentos lavanda, azul hielo y menta.
- Cinco fondos estáticos: Aurora, Océano, Atardecer, Cordillera y Grafito.
- Intensidad del fondo configurable y preferencias persistentes.
- Widget de clima opcional y selección inicial de ciudad. La conexión DMC está
  pendiente: no se muestran temperaturas ficticias y el endpoint queda desactivado.
- Caché, límite de consultas y suspensión en segundo plano comprobados con mocks.

Paquete nuevo: `artifacts/Orbita-TV-0.2.0-unsigned.wgt`.
La versión anterior se conserva. No está firmado ni probado en el televisor.
Detalles del bloqueo y diseño de extracción en [docs/clima-dmc.md](docs/clima-dmc.md).


## Versión 0.3.0 (actual)

- Bienvenida inicial con nombre opcional, ciudad y confirmación de la hora mostrada.
- Perfil editable desde Ajustes; cambios y personalización anterior se conservan.
- Hora por ciudad basada en el reloj del TV y zonas IANA; no cambia el reloj Samsung.
  Contempla Rapa Nui y el horario permanente de Aysén/Magallanes. Mantener firmware
  y fecha/hora automáticas actualizados. No se sincroniza con horaoficial.cl:
  el sitio devolvió un desafío CAPTCHA durante la investigación.
- Activa el clima al guardar el perfil. Se consulta el archivo público DMC como
  texto y se analiza sin ejecutar código remoto. Sin servidor desplegado.
  CORS, permisos, certificado y conectividad reales requieren verificación en TV.
  Si la lectura directa está bloqueada, será necesario un intermediario HTTPS.
- Gestión guiada desde el menú Samsung. NO desinstala paquetes desde código.
  La API oficial exige `packagemanager.install` de nivel plataforma; ese privilegio
  no se añade al manifiesto porque una firma de desarrollador no lo proporciona.
  Samsung decide qué preinstaladas permiten Eliminar; las protegidas solo se ocultan
  en Órbita. No se toca firmware ni servicios Bluetooth/red/sintonizador.

```sh
node tests/dmc.cjs
node tests/browser.cjs
python scripts/package.py
```

Paquete: `artifacts/Orbita-TV-0.3.0-unsigned.wgt`, aún sin firmar ni instalar en TV.
Pruebas: bienvenida, perfil persistente, texto escapado, zonas horarias invierno,
parser DMC (incluida muestra real descargada), estados sin datos y funciones previas.
Ninguna prueba mide rendimiento físico del QN70F.

Fuentes: [Samsung Package API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/package-api.html),
[datos usados por DMC](https://archivos.meteochile.gob.cl/portaldmc/appdata/condicionactual.js),
[Hora Oficial](https://horaoficial.cl).


## Versión 0.4.0 (actual)

Bienvenida a pantalla completa: Bienvenido → disolución breve tipo arena → nombre
(o alias) → ciudad → entrar. El efecto solo corre una vez, tiene hasta 650 partículas,
dura 700 ms y libera su canvas y temporizadores al terminar o cerrar la bienvenida.
Respeta movimiento reducido, ofrece “Sin animaciones” y conserva la opción al guardar.
No se repite la introducción al editar un perfil ya configurado.

El nombre queda en el dispositivo; la ciudad selecciona zona horaria y estación DMC.
Conserva los fondos, favoritos y el resto de funciones de las versiones anteriores.
Paquete `artifacts/Orbita-TV-0.4.0-unsigned.wgt`: falta firma y validación en hardware.

### Verificación SHOA

`ntp.shoa.cl` resuelve a varios servidores. Una única consulta UDP/123 desde este
entorno fue rechazada con ConnectionRefusedError; NO se obtuvo una respuesta NTP
válida ni se verificó su estrato. Eso no demuestra que el servicio esté caído.
El entorno proporciona proxy HTTP/TCP; la app web Tizen tampoco dispone de sockets
UDP normales. No se añadió una sincronización ficticia ni se cambió el reloj del TV.
La hora continúa usando el reloj del sistema con la zona IANA de la ciudad.

Para probar desde Windows con Python, en una red que permita NTP:

```powershell
py scripts/check_shoa.py
```

Realiza solo una consulta y no modifica el reloj. Verifica origen, modo, versión,
estrato y marcas temporales, e informa UTC y diferencia frente al PC. Si devuelve
verified=true, faltará implementar y desplegar un puente HTTPS para sincronizar
el reloj mostrado en la app; una respuesta desde el PC no habilita UDP en Tizen.
No se publica ni despliega ningún servicio mediante este cambio.
