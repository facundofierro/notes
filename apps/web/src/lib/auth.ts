import crypto from "crypto";

export interface GatewayTokenPayload {
  email: string;
  name: string;
  image?: string;
  iat: number;
  exp: number;
  [key: string]: unknown;
}

const DEFAULT_SECRET = "dev-insecure-gateway-secret-change-me";
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function getGatewayJwtSecret() {
  return process.env.GATEWAY_JWT_SECRET || DEFAULT_SECRET;
}

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function fromBase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf-8");
}

function signHmacSha256(data: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url");
}

export async function signGatewayToken(payload: {
  email: string;
  name: string;
  image?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const body: GatewayTokenPayload = {
    email: payload.email,
    name: payload.name,
    image: payload.image,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(body));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signature = signHmacSha256(unsignedToken, getGatewayJwtSecret());

  return `${unsignedToken}.${signature}`;
}

export async function verifyGatewayToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = signHmacSha256(unsignedToken, getGatewayJwtSecret());
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (
    signatureBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(signatureBuf, expectedBuf)
  ) {
    throw new Error("Invalid token signature");
  }

  const header = JSON.parse(fromBase64Url(encodedHeader));
  if (header.alg !== "HS256") {
    throw new Error("Unsupported token algorithm");
  }

  const payload = JSON.parse(fromBase64Url(encodedPayload)) as GatewayTokenPayload;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= now) {
    throw new Error("Token expired");
  }

  return payload;
}
