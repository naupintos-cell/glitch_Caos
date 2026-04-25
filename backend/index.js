require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const app = express();

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
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
const paidSessions  = new Map(); // sessionId → { paymentId, status, method, createdAt }
const usdtClaims    = new Map(); // sessionId → { wallet, claimedAt, verified }

// Limpieza automática de sesiones viejas (> 24hs)
setInterval(() => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const [key, val] of paidSessions) {
    if (val.createdAt < cutoff) paidSessions.delete(key);
  }
  for (const [key, val] of usdtClaims) {
    if (val.claimedAt < cutoff) usdtClaims.delete(key);
  }
}, 60 * 60 * 1000);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function isValidSessionId(id) {
  return id && typeof id === 'string' && id.length <= 64;
}

function log(label, msg) {
  console.log(`[${new Date().toISOString()}] [${label}] ${msg}`);
}

// ─── RUTAS ────────────────────────────────────────────────────────────────────

// Health check
app.get('/health', (_, res) => res.json({
  ok: true,
  service: 'glitch-backend',
  sessions: paidSessions.size,
  usdtClaims: usdtClaims.size,
}));

// 1. Crear preferencia de pago MP
app.post('/create-preference', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!isValidSessionId(sessionId)) {
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
        back_urls: {
          success: `${process.env.FRONTEND_URL}?payment=success&session=${sessionId}`,
          failure: `${process.env.FRONTEND_URL}?payment=failure&session=${sessionId}`,
          pending: `${process.env.FRONTEND_URL}?payment=pending&session=${sessionId}`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.BACKEND_URL}/webhook`,
        metadata: { sessionId },
        expires: true,
        expiration_date_from: new Date().toISOString(),
        expiration_date_to:   new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        statement_descriptor: 'GLITCH JUEGO',
      },
    });

    log('create-preference', `session=${sessionId} preference=${result.id}`);

    res.json({
      preferenceId: result.id,
      checkoutUrl:  result.init_point,
      sandboxUrl:   result.sandbox_init_point,
    });

  } catch (err) {
    console.error('[create-preference]', err.message);
    res.status(500).json({ error: 'No se pudo crear la preferencia de pago' });
  }
});

// 2. Webhook de MercadoPago
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const { type, data } = req.body;
    if (type !== 'payment' || !data?.id) return;

    const payment = new Payment(mpClient);
    const paymentData = await payment.get({ id: data.id });

    const { status, metadata } = paymentData;
    const sessionId = metadata?.session_id;

    log('webhook', `payment=${data.id} status=${status} session=${sessionId}`);

    if (status === 'approved' && sessionId) {
      paidSessions.set(sessionId, {
        paymentId: String(data.id),
        status:    'approved',
        method:    'mercadopago',
        createdAt: Date.now(),
      });
    }

  } catch (err) {
    console.error('[webhook]', err.message);
  }
});

// 3. Verificar pago (MP o USDT)
app.get('/check-payment/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  if (!isValidSessionId(sessionId)) {
    return res.status(400).json({ error: 'sessionId inválido' });
  }

  const session = paidSessions.get(sessionId);

  if (session?.status === 'approved') {
    return res.json({ paid: true, paymentId: session.paymentId, method: session.method || 'mercadopago' });
  }

  res.json({ paid: false });
});

// 4. Claim de pago USDT
// El frontend llama esto cuando el jugador dice "ya envié el USDT"
// Desbloquea de forma optimista y guarda el claim para revisión manual
app.post('/usdt-claim', async (req, res) => {
  try {
    const { sessionId, wallet } = req.body;

    if (!isValidSessionId(sessionId)) {
      return res.status(400).json({ error: 'sessionId inválido' });
    }

    // Evitar claims duplicados
    if (usdtClaims.has(sessionId)) {
      const existing = usdtClaims.get(sessionId);
      return res.json({ ok: true, status: existing.verified ? 'verified' : 'pending' });
    }

    const claim = {
      sessionId,
      wallet:    wallet || 'TAKobVisVDmrNRhEmvETXRGG9Uq98MXbsM',
      claimedAt: Date.now(),
      verified:  false,
    };

    usdtClaims.set(sessionId, claim);

    // Registro del claim para verificación manual
    log('usdt-claim', `session=${sessionId} wallet=${claim.wallet}`);

    // Desbloqueo optimista: marcamos la sesión como pagada con método 'usdt-pending'
    // Si la verificación falla podés revocarla desde /admin/usdt-claims
    paidSessions.set(sessionId, {
      paymentId: `usdt-${sessionId.slice(0, 8)}`,
      status:    'approved',
      method:    'usdt-pending',
      createdAt: Date.now(),
    });

    res.json({ ok: true, status: 'pending', message: 'Claim registrado. Verificación en proceso.' });

  } catch (err) {
    console.error('[usdt-claim]', err.message);
    res.status(500).json({ error: 'Error al registrar el claim' });
  }
});

// 5. Admin: ver todos los claims USDT pendientes
// Usalo para verificar manualmente en el explorer de Tron
// GET /admin/usdt-claims?key=TU_ADMIN_KEY
app.get('/admin/usdt-claims', (req, res) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || req.query.key !== adminKey) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const claims = [];
  for (const [sessionId, claim] of usdtClaims) {
    claims.push({ sessionId, ...claim });
  }

  // Ordenar por más reciente primero
  claims.sort((a, b) => b.claimedAt - a.claimedAt);

  res.json({
    total: claims.length,
    pending: claims.filter(c => !c.verified).length,
    claims,
  });
});

// 6. Admin: verificar o revocar un claim USDT
// POST /admin/usdt-verify?key=TU_ADMIN_KEY { sessionId, verified: true/false }
app.post('/admin/usdt-verify', (req, res) => {
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey || req.query.key !== adminKey) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { sessionId, verified } = req.body;

  if (!isValidSessionId(sessionId)) {
    return res.status(400).json({ error: 'sessionId inválido' });
  }

  const claim = usdtClaims.get(sessionId);
  if (!claim) {
    return res.status(404).json({ error: 'Claim no encontrado' });
  }

  if (verified) {
    // Confirmar pago
    claim.verified = true;
    usdtClaims.set(sessionId, claim);
    const session = paidSessions.get(sessionId);
    if (session) {
      session.method = 'usdt-verified';
      paidSessions.set(sessionId, session);
    }
    log('usdt-verify', `VERIFIED session=${sessionId}`);
    res.json({ ok: true, status: 'verified' });
  } else {
    // Revocar: ya pagó con USDT falso o no llegó
    usdtClaims.delete(sessionId);
    paidSessions.delete(sessionId);
    log('usdt-verify', `REVOKED session=${sessionId}`);
    res.json({ ok: true, status: 'revoked' });
  }
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🤖 GLITCH backend corriendo en puerto ${PORT}`);
  console.log(`   NODE_ENV:      ${process.env.NODE_ENV || 'development'}`);
  console.log(`   FRONTEND_URL:  ${process.env.FRONTEND_URL || '(no configurado)'}`);
  console.log(`   BACKEND_URL:   ${process.env.BACKEND_URL || '(no configurado)'}`);
  if (!process.env.ADMIN_KEY) {
    console.warn('   ⚠️  ADMIN_KEY no configurado — endpoints /admin/* sin protección');
  }
});
