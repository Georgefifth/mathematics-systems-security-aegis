export default function handler(req, res) {
  res.status(200).json({
    status: "healthy",
    service: "AegisAgent Enclave Gateway (Vercel Serverless)",
    version: "0.1.0",
    constant_time_engine: "Mersenne-Cauchy F_{2^31-1}"
  });
}
