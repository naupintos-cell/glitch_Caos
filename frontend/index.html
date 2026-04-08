require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const app = express();

// CORS: solo permite requests desde tu dominio del juego
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Permite requests sin origin (ej: curl, Postman) solo en dev
    if (!origin && process.env.NODE_ENV !== 'production') return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`Origin no permitido: ${origin}`));
  },
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// ─── MERCADOPAGO ──────────────────────────────────────────────────────────────
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 },
});

// ─── STORE EN MEMORIA ─────────────────────────────────────────────────────────
// En producción reemplazar con Redis o base de datos
// Guarda { paymentId: { status, sessionId, createdAt } }
const paidSessions = new Map();

// Limpieza automática de sesiones viejas (> 24hs)
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [key, val] of paidSessions) {
    if (val.createdAt < cutoff) paidSessions.delete(key);
  }
}, 60 * 60 * 1000); // cada 1 hora

// ─── RUTAS ────────────────────────────────────────────────────────────────────

// Health check — Railway lo usa para saber si el servicio está vivo
app.get('/health', (_, res) => res.json({ ok: true, service: 'glitch-backend' }));

// 1. Crear preferencia de pago
// El frontend llama esto para obtener la URL del Checkout Pro
app.post('/create-preference', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
      return res.status(400).json({ error: 'sessionId inválido' });
    }

    const preference = new Preference(mpClient);

    const result = await preference.create({
      body: {
        items: [{
          id:          'glitch-unlock',
          title:       'GLITCH — desbloqueo completo',
          description: 'Pago único. Sin newsletter. Sin drama.',
          quantity:    1,
          unit_price:  3000,
          currency_id: 'ARS',
        }],
        // URLs a donde MP redirige al usuario después del pago
        back_urls: {
          success: `${process.env.FRONTEND_URL}?payment=success&session=${sessionId}`,
          failure: `${process.env.FRONTEND_URL}?payment=failure&session=${sessionId}`,
          pending: `${process.env.FRONTEND_URL}?payment=pending&session=${sessionId}`,
        },
        auto_return: 'approved',
        // Webhook: MP llama a esta URL cuando el pago cambia de estado
        notification_url: `${process.env.BACKEND_URL}/webhook`,
        // Metadata para rastrear la sesión del jugador
        metadata: { sessionId },
        // Vence en 30 minutos
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to:   new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        statement_descriptor: 'GLITCH JUEGO',
      },
    });

    res.json({
      preferenceId: result.id,
      checkoutUrl:  result.init_point,        // producción
      sandboxUrl:   result.sandbox_init_point, // testing
    });

  } catch (err) {
    console.error('[create-preference]', err.message);
    res.status(500).json({ error: 'No se pudo crear la preferencia de pago' });
  }
});

// 2. Webhook de MercadoPago
// MP llama aquí cuando el estado de un pago cambia
app.post('/webhook', async (req, res) => {
  // MP espera 200 rápido, procesamos async
  res.sendStatus(200);

  try {
    const { type, data } = req.body;

    // Solo nos interesan notificaciones de pagos
    if (type !== 'payment' || !data?.id) return;

    const payment = new Payment(mpClient);
    const paymentData = await payment.get({ id: data.id });

    const { status, metadata } = paymentData;
    const sessionId = metadata?.session_id; // MP snake_cases las keys de metadata

    console.log(`[webhook] payment ${data.id} → ${status} | session: ${sessionId}`);

    if (status === 'approved' && sessionId) {
      paidSessions.set(sessionId, {
        paymentId:  String(data.id),
        status:     'approved',
        createdAt:  Date.now(),
      });
    }

  } catch (err) {
    console.error('[webhook]', err.message);
  }
});

// 3. Verificar si una sesión pagó
// El frontend consulta esto al volver de MP
app.get('/check-payment/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  if (!sessionId || sessionId.length > 64) {
    return res.status(400).json({ error: 'sessionId inválido' });
  }

  const session = paidSessions.get(sessionId);

  if (session?.status === 'approved') {
    return res.json({ paid: true, paymentId: session.paymentId });
  }

  res.json({ paid: false });
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 GLITCH backend corriendo en puerto ${PORT}`);
  console.log(`   NODE_ENV:      ${process.env.NODE_ENV || 'development'}`);
  console.log(`   FRONTEND_URL:  ${process.env.FRONTEND_URL || '(no configurado)'}`);
  console.log(`   BACKEND_URL:   ${process.env.BACKEND_URL || '(no configurado)'}`);
});
