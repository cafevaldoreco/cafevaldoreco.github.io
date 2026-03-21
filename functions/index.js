const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({ maxInstances: 10 });

// ===== 1. GENERAR FIRMA PARA WOMPI =====
exports.generarFirmaWompi = onRequest(
  { 
    secrets: ["WOMPI_INTEGRITY_KEY"],
    cors: ["https://cafevaldoreco.github.io", "https://cafevaldore.com"]
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    const { referencia, monto, moneda } = req.body;
    const llaveIntegridad = process.env.WOMPI_INTEGRITY_KEY;
    const cadena = `${referencia}${monto}${moneda}${llaveIntegridad}`;
    const firma = crypto.createHash("sha256").update(cadena).digest("hex");
    
    res.status(200).json({ firma });
  }
);

// ===== 2. WEBHOOK DE WOMPI =====
exports.wompiWebhook = onRequest(
  { 
    secrets: ["WOMPI_INTEGRITY_KEY"],
    cors: true
  },
  async (req, res) => {
    try {
      const evento = req.body;

      if (evento.event === "transaction.updated") {
        const transaccion = evento.data.transaction;
        const referencia = transaccion.reference;
        const estado = transaccion.status;

        const pedidosRef = db.collection("pedidos");
        const query = await pedidosRef
          .where("numeroPedido", "==", referencia)
          .get();

        if (!query.empty) {
          const pedidoDoc = query.docs[0];

          let nuevoEstado = "pendiente";
          if (estado === "APPROVED") nuevoEstado = "pagado";
          else if (estado === "DECLINED") nuevoEstado = "pago-rechazado";
          else if (estado === "VOIDED") nuevoEstado = "pago-cancelado";

          await pedidoDoc.ref.update({
            estado: nuevoEstado,
            estadoPago: estado,
            fechaPago: new Date().toISOString(),
            transaccionWompi: transaccion.id,
          });
        }
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error("❌ Error en webhook:", error);
      res.status(500).send("Error");
    }
  }
);