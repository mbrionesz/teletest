"""Single SNTP probe. No clock writes, retries, dependencies or credential access."""
import datetime
import json
import socket
import struct
import time

EPOCH = 2208988800

def probe():
    packet = bytearray(48)
    packet[0] = 0x23  # NTPv4, client mode
    t1 = time.time()
    seconds = t1 + EPOCH
    stamp = struct.pack('!II', int(seconds), int((seconds % 1) * 2**32))
    packet[40:48] = stamp
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.settimeout(4)
        # Connected UDP restricts responses to the selected address and port.
        sock.connect(socket.getaddrinfo('ntp.shoa.cl', 123, socket.AF_INET, socket.SOCK_DGRAM)[0][4])
        sock.send(packet)
        data = sock.recv(512)
        t4 = time.time()
    if len(data) < 48 or data[24:32] != stamp or data[0] & 7 != 4:
        raise ValueError('La respuesta no corresponde a esta consulta SNTP')
    if data[0] >> 6 == 3 or not 1 <= data[1] <= 15 or (data[0] >> 3) & 7 not in (3, 4):
        raise ValueError('Servidor no sincronizado, versión no válida o respuesta de limitación')
    def timestamp(start):
        sec, fraction = struct.unpack('!II', data[start:start + 8])
        return sec - EPOCH + fraction / 2**32
    t2, t3 = timestamp(32), timestamp(40)
    if not all(abs(t - t4) < 86400 for t in (t2, t3)) or t3 < t2:
        raise ValueError('Marcas horarias incoherentes; comprobar también la fecha del PC')
    offset = ((t2 - t1) + (t3 - t4)) / 2
    return {'verified': True, 'source': 'ntp.shoa.cl', 'stratum': data[1],
            'utc': datetime.datetime.fromtimestamp(t4 + offset, datetime.timezone.utc).isoformat(),
            'offset_ms': round(offset * 1000, 2), 'clock_modified': False}

if __name__ == '__main__':
    try:
        print(json.dumps(probe(), ensure_ascii=False))
    except (OSError, ValueError) as exc:
        print(json.dumps({'verified': False, 'error': str(exc), 'clock_modified': False}, ensure_ascii=False))
        raise SystemExit(1)
