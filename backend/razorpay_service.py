import os

import razorpay


class RazorpayService:

    def __init__(self):
        key_id = os.getenv("RAZORPAY_KEY_ID")
        key_secret = os.getenv("RAZORPAY_KEY_SECRET")

        if not key_id or not key_secret:
            raise RuntimeError(
                "Razorpay credentials are not configured."
            )

        self.key_id = key_id

        self.client = razorpay.Client(
            auth=(key_id, key_secret)
        )

    def create_order(
        self,
        amount: float,
        receipt: str,
    ):
        if amount <= 0:
            raise ValueError(
                "Amount must be greater than zero."
            )

        amount_paise = int(
            round(amount * 100)
        )

        return self.client.order.create(
            data={
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
            }
        )

    def verify_payment_signature(
        self,
        order_id: str,
        payment_id: str,
        signature: str,
    ):
        self.client.utility.verify_payment_signature(
            {
                "razorpay_order_id": order_id,
                "razorpay_payment_id": payment_id,
                "razorpay_signature": signature,
            }
        )

        return True