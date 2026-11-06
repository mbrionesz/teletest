# Estado actualizado en Órbita 0.3.0

El acceso al sitio ya funciona. Se identificó la fuente real en el renderizador
oficial: `https://archivos.meteochile.gob.cl/portaldmc/appdata/condicionactual.js`.
No usar el archivo antiguo `meteochile/scripts/condicionactualmetar.js`, que contiene
ejemplos comentados. La fuente actual es JavaScript de datos, unos 3 KB, no JSON.
El código 0.3 la analiza como texto sin eval ni insertar scripts remotos.

El catálogo se obtuvo del switch de ciudades del renderizador oficial. Algunas
estaciones están vacías; se mantiene el estado sin datos. No se sustituye una estación
por otra silenciosamente. Se utiliza la fecha publicada y la hora local de cada
estación. Su conversión asume que el sello de publicación usa hora continental,
consistente con la muestra observada; debe comprobarse con más muestras en cambios
horarios. Las regiones con horario permanente se contemplan por ciudad.

Se habilitó el origen HTTPS específico y el privilegio internet en el paquete.
La respuesta consultada carecía de cabecera Access-Control-Allow-Origin.
No se ha verificado que Tizen permita la lectura directa; el navegador ordinario
puede bloquearla. Si ocurre, hará falta el intermediario descrito abajo.
Los términos de reutilización no se han confirmado; no se declara una API oficial
ni se ha desplegado un servicio de redistribución. El endpoint ahora está activado
en el código: los estados del diseño 0.2 que siguen son antecedentes históricos.

---

# Investigación de condición actual DMC

## Resultado comprobado

Se intentó consultar por HTTPS la URL proporcionada:
https://www.meteochile.gob.cl/PortalDMC-web/index.xhtml

La petición no llegó al sitio: el proxy del entorno rechazó CONNECT con HTTP 403.
Se guardó el dominio exacto `www.meteochile.gob.cl` en el borrador de red,
conservando los presets y demás destinos. Guardar el borrador no aplica la política.
La herramienta requiere revisar/guardar en configuración y publicar el entorno.
No se han verificado HTML, robots.txt, términos, catálogo de ciudades,
frecuencia real de observaciones, endpoints, CORS ni permiso para reutilizar datos.
No se ha escrito un scraper contra un formato supuesto.

## Diseño propuesto, sujeto a verificar la fuente

1. Examinar las peticiones de “Condición actual” con las herramientas del navegador.
   Preferir un servicio público documentado si existe. Si la pantalla usa JSF/Ajax,
   no asumir que es una API pública estable ni que basta descargar index.xhtml.
2. Confirmar condiciones de reutilización y robots.txt antes de automatizar.
3. Identificar estaciones, ciudad cubierta, unidad y zona horaria de cada observación.
   Una estación cercana no representa necesariamente todas las comunas de una ciudad.
4. Si hace falta extraer HTML, hacerlo en un pequeño servicio compartido, con caché,
   límites, timeouts y pruebas usando muestras reales. No cargar ni analizar el portal
   completo en el televisor. Un servicio remoto evita necesitar el PC encendido.
5. Servir JSON pequeño por HTTPS y habilitar únicamente el origen necesario en Tizen.
   Comprobar CORS y confianza TLS en la TV. No desactivar validación TLS.

No se presupone que todas las ciudades dispongan de una observación actual.
El selector contiene 16 ciudades iniciales de interfaz, no un catálogo confirmado
por la DMC. Está pendiente sustituirlo por la cobertura realmente disponible.

## Preparado en Órbita 0.2.0

Widget opcional, apagado inicialmente, con ciudad persistente, iconos SVG pequeños,
temperatura, condición y hora/fecha de observación. La atribución DMC solo aparece
cuando existe una observación que cumple el contrato. Sin datos muestra claramente
“Conexión DMC pendiente” o “Sin datos disponibles”; no inventa temperatura.

`app/weather-config.js` deja `endpoint: null`. Así no se envían peticiones.
No hay servicio desplegado ni scraping funcionando. El usuario de la TV no tiene
que configurar URLs en la interfaz.

El adaptador tiene caché por ciudad y limita intentos a uno cada 30 minutos por
ciudad, también después de recargar. Cancela la petición y el temporizador al
ocultarse. Timeout de 8 segundos, máximo 16 KiB y validación de los datos recibidos.
Conserva el último dato válido si falla la consulta; después de 90 minutos de la
observación muestra “Dato antiguo” con su fecha/hora. No es una medida de frescura
confirmada por la DMC. El valor puede seguir visible como antiguo hasta reemplazarse.

## Contrato JSON propuesto (ejemplo ficticio, no dato real)

```json
{
  "city": "Santiago",
  "temperatureC": 18,
  "condition": "cloudy",
  "observedAt": "2026-11-05T15:00:00-03:00",
  "station": "Estación por verificar",
  "source": "DMC"
}
```

Condiciones internas: clear, partly_cloudy, cloudy, fog, rain, snow, storm, unknown.
El futuro normalizador debe mapear las condiciones reales; no adivinar según hora
ni convertir ausencia de datos en “despejado”. El endpoint recibe `?city=...`.

Antes de habilitarlo: verificar parser y catálogo con evidencia real, desplegar el
servicio, establecer el endpoint HTTPS y añadir `internet` y `<access>` para ese
origen concreto en `app/config.xml`; repetir las pruebas con el certificado del TV.

## Validación realizada

Pruebas de navegador con endpoint interceptado y datos sintéticos: carga inicial,
caché tras recarga, límite de frecuencia, respuesta HTTP 503, dato antiguo y
suspensión en segundo plano. No verifican DMC, red doméstica ni rendimiento QN70F.
