[deploy.md](https://github.com/user-attachments/files/26579510/deploy.md)
# Guía de Deploy — GLITCH

Paso a paso para tener el juego online con pagos funcionando.

---

## Requisitos previos

- [ ] Cuenta en [GitHub](https://github.com)
- [ ] Cuenta en [Netlify](https://netlify.com) (gratis)
- [ ] Cuenta en [Railway](https://railway.app) (gratis, 500hs/mes)
- [ ] Cuenta en [MercadoPago Developers](https://www.mercadopago.com.ar/developers)

---

## Paso 1 — Subir el repo a GitHub

```bash
git clone https://github.com/TU-USUARIO/glitch.git
# O si empezás desde cero:
git init
git add .
git commit -m "🎮 init: GLITCH v1"
git remote add origin https://github.com/TU-USUARIO/glitch.git
git push -u origin main
```

---

## Paso 2 — Deploy del backend en Railway

1. Entrás a [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → seleccionás `glitch`
3. Railway detecta el `backend/` automáticamente. Si no:
   - Settings → **Root Directory** → `backend`
4. Settings → **Variables** → agregás todas las del `.env.example`:

| Variable | Dónde conseguirla |
|---|---|
| `MP_ACCESS_TOKEN` | MP Developers → tu app → Credenciales |
| `MP_PUBLIC_KEY` | Idem |
| `FRONTEND_URL` | La URL de Netlify del paso 3 |
| `BACKEND_URL` | Settings → Domains en Railway (la generás ahí) |
| `ALLOWED_ORIGINS` | Igual que `FRONTEND_URL` |
| `NODE_ENV` | `production` |

5. Settings → **Domains** → Generate Domain → copiás la URL (`glitch-backend-xxxx.up.railway.app`)

---

## Paso 3 — Deploy del frontend en Netlify

### Opción A: Drag & drop (más rápido)
1. Vas a [drop.netlify.com](https://drop.netlify.com)
2. Arrastrás la carpeta `frontend/`
3. Copiás la URL que te da (ej: `random-name.netlify.app`)

### Opción B: Conectado a GitHub (recomendado para updates)
1. Netlify → **Add new site** → **Import from Git**
2. Seleccionás el repo `glitch`
3. **Base directory**: `frontend`
4. **Publish directory**: `frontend`
5. **Build command**: (vacío, no hay build)
6. Deploy

---

## Paso 4 — Actualizar las URLs

### En el frontend (`frontend/index.html`)
Buscás la línea ~1117 y cambiás:
```js
const BACKEND_URL = 'https://glitch-backend-xxxx.up.railway.app';
```

### En Railway (variables de entorno)
```
FRONTEND_URL=https://tu-juego.netlify.app
BACKEND_URL=https://glitch-backend-xxxx.up.railway.app
ALLOWED_ORIGINS=https://tu-juego.netlify.app
```

---

## Paso 5 — Configurar webhook en MercadoPago

1. [mercadopago.com.ar/developers/panel/app](https://www.mercadopago.com.ar/developers/panel/app)
2. Tu aplicación → **Webhooks** → **Agregar**
3. URL: `https://glitch-backend-xxxx.up.railway.app/webhook`
4. Eventos: ✅ `Pagos`
5. Guardar

---

## Paso 6 — Probar con modo TEST

MP tiene credenciales de test separadas de producción.

1. En MP Developers → tu app → **Credenciales de prueba**
2. Copiás el `access_token` de TEST y lo ponés en Railway
3. Usás [tarjetas de prueba de MP](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards) para simular pagos

Para testear el webhook localmente podés usar [ngrok](https://ngrok.com):
```bash
ngrok http 3000
# Te da una URL pública → la usás como BACKEND_URL temporalmente
```

---

## Paso 7 — Pasar a producción

1. En Railway → Variables → reemplazás `MP_ACCESS_TOKEN` por el de **producción**
2. En MP Developers → Webhooks → actualizás si la URL cambió
3. Testeás con un pago real de $1 para confirmar el flujo

---

## Checklist final

- [ ] Backend en Railway respondiendo (`/health` devuelve `{"ok":true}`)
- [ ] Frontend en Netlify cargando sin errores
- [ ] `BACKEND_URL` en el HTML apunta a Railway
- [ ] Webhook configurado en MP Developers
- [ ] Pago de prueba aprobado y juego desbloqueado
- [ ] Pago de producción testeado

---

## Troubleshooting

**El juego no carga el tablero**
→ Abrí la consola del browser (F12) y revisá si hay errores JS.

**El botón de pago dice "Error al conectar"**
→ Verificá que `BACKEND_URL` en el HTML sea correcto y que Railway esté corriendo (`/health`).

**MP no llama al webhook**
→ Verificá la URL en MP Developers. Railway debe estar respondiendo 200 en `/webhook`.

**El pago se aprueba pero el juego no se desbloquea**
→ El polling consulta cada 3 segundos. Esperá ~10 segundos después de aprobar el pago. Si sigue sin funcionar, revisá los logs de Railway.

**`localStorage` no funciona**
→ Estás abriendo el HTML como archivo local (`file://`). Subilo a Netlify para que funcione correctamente.
