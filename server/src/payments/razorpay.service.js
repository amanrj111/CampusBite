import Razorpay from "razorpay";
import crypto from "node:crypto";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  throw new Error(
    "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured in server/.env",
  );
}

export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

export async function createRazorpayOrder({
  amountPaise,
  receipt,
  notes = {},
}) {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new Error("Payment amount must be a positive integer in paise");
  }

  return razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt,
    notes,
  });
}

export function verifyRazorpaySignature({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) {
  if (
    typeof razorpay_order_id !== "string" ||
    typeof razorpay_payment_id !== "string" ||
    typeof razorpay_signature !== "string" ||
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !/^[a-f0-9]{64}$/i.test(razorpay_signature)
  ) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest();

  const receivedSignature = Buffer.from(razorpay_signature, "hex");

  return (
    expectedSignature.length === receivedSignature.length &&
    crypto.timingSafeEqual(expectedSignature, receivedSignature)
  );
}

// Fetch payment details directly from Razorpay.
export async function fetchRazorpayPayment(paymentId) {
  if (typeof paymentId !== "string" || !paymentId) {
    throw new Error("A valid Razorpay payment ID is required");
  }
  return razorpay.payments.fetch(paymentId);
}
