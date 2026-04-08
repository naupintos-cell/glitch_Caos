# GLITCH — el juego que te odia

> Un juego de memoria con una IA que odia su trabajo.  
> Built by [KAIRO](https://kairo.com.ar) · Make it simple — 2026

---

## Estructura

```
glitch/
├── frontend/
│   └── index.html          # El juego completo (un solo archivo)
├── backend/
│   ├── index.js            # API Express — pagos MercadoPago
│   ├── package.json
│   └── .env.example        # Variables de entorno (plantilla)
├── docs/
│   └── deploy.md           # Guía de deploy paso a paso
└── README.md
```

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML + CSS + JS vanilla (un archivo) |
| Backend | Node.js + Express |
| Pagos | MercadoPago Checkout Pro |
| Deploy frontend | Netlify |
| Deploy backend | Railway |

## Mecánicas del juego

- **Multiplicador de score** — sube con aciertos, cae con errores. Cada fallo duele.
- **Carta maldita** — revela todo el tablero 2 segundos y después lo mezcla.
- **Pistas de la IA** — 45% son falsas si no pagaste, 0% si pagaste.
- **Cartas que se mueven** — a partir del nivel 2, el tablero traiciona tu memoria.
- **Paywall a los 4 errores** — se siente tuyo, no forzado.
- **Última vida gratis** — reduce el drop del paywall duro.

## Setup local (desarrollo)

```bash
# Clonar
git clone https://github.com/TU-USUARIO/glitch.git
cd glitch

# Backend
cd backend
cp .env.example .env
# Editás .env con tus credenciales de MP
npm install
npm run dev

# Frontend
# Abrís frontend/index.html directo en el browser
# O con un servidor local para que funcione el clipboard:
npx serve frontend
```

## Deploy

Ver [`docs/deploy.md`](docs/deploy.md) para el paso a paso completo.

## Variables de entorno

Ver [`backend/.env.example`](backend/.env.example).

---

*GLITCH — el juego que te odia. La IA también.*
