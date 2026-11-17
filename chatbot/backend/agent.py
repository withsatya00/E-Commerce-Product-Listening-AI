"""Chatbot AI agent with Gemini 2.5 Flash Lite function calling and fallback engine."""
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import httpx
from chatbot.backend.config import chatbot_settings
from chatbot.backend.models import (
    ChatResponse,
    OrderTrackingResult,
    ProductCardItem,
)
from chatbot.backend.prompts import CHATBOT_SYSTEM_PROMPT
from chatbot.backend.tools import (
    GEMINI_CHAT_TOOLS,
    execute_get_order_status,
    execute_get_store_policy,
    execute_search_products,
)

log = logging.getLogger("chatbot")


class ChatbotAgent:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key if api_key is not None else os.getenv("GEMINI_API_KEY", "")
        self.model = chatbot_settings.model
        self.client = httpx.AsyncClient(timeout=5.0)

    async def chat(
        self,
        user_message: str,
        session_id: str,
        history: Optional[List[Dict[str, str]]] = None,
        db_session: Any = None
    ) -> ChatResponse:
        """Process incoming user message through Gemini tool-calling or rule-based intelligent fallback."""
        msg_lower = user_message.lower().strip()
        matched_products: List[ProductCardItem] = []
        matched_order: Optional[OrderTrackingResult] = None
        quick_suggestions: List[str] = []
        offline_mode = os.getenv("TX_OFFLINE", "0") == "1"

        # 1. Order tracking detection (e.g. ORD-10294 or numeric order ID, not the word 'order')
        order_match = re.search(r"\b(ORD[-_][A-Za-z0-9-_]+|\b\d{5,12}\b)\b", user_message, re.IGNORECASE)
        is_order_query = bool(order_match or any(k in msg_lower for k in ["order", "track", "delivery", "kahan pahuncha"]))

        # 2. Product search detection (e.g. 'shirt', 'black', 'buy', 'shoes', 'cotton', 'under')
        is_product_query = any(k in msg_lower for k in [
            "shirt", "tshirt", "t-shirt", "cotton", "black", "blue", "navy", "white", "size",
            "price", "dikhao", "buy", "product", "dress", "kurta", "jeans", "formal", "casual"
        ])

        # 3. Policy detection (e.g. 'return', 'refund', 'policy', 'payment', 'cod', 'shipping')
        is_policy_query = any(k in msg_lower for k in [
            "return", "refund", "replace", "exchange", "shipping", "deliver", "charge", "payment", "cod", "upi"
        ])

        # Execute appropriate tools based on intent
        if order_match:
            order_num = order_match.group(1).upper()
            matched_order = await execute_get_order_status(order_num, db_session)
            quick_suggestions = ["View Invoice", "Delivery Address", "Need Help with Order"]
        elif is_order_query and not order_match:
            quick_suggestions = ["How do I find Order ID?", "Need Help with Order", "7-Day Return Policy"]

        if is_product_query:
            # Extract price/budget filter supporting English & Hinglish (e.g. 'under 1000', '500 ke andar', '1500 tak')
            price_match = re.search(
                r"(?:under|below|less than|max|budget)\s*(?:rs\.?|inr|₹)?\s*(\d{2,6})|\b(\d{2,6})\s*(?:ke\s*an[a-z]+r|tak|k\s*andar|rupaye|\/-)",
                msg_lower
            )
            max_price = float(price_match.group(1) or price_match.group(2)) if price_match else None
            matched_products = await execute_search_products(
                query=user_message,
                max_price=max_price,
                db_session=db_session
            )
            quick_suggestions = ["View Size Guide", "Check Delivery Time", "Available Colors"]

        if is_policy_query and not quick_suggestions:
            quick_suggestions = ["7-Day Return Policy", "Free Shipping Info", "Payment Modes"]

        # Call real Gemini API if key is configured and not in offline test mode
        if not offline_mode and self.api_key and len(self.api_key) > 10:
            try:
                gemini_reply = await self._call_gemini(user_message, matched_products, matched_order)
                if gemini_reply:
                    return ChatResponse(
                        session_id=session_id,
                        reply=gemini_reply,
                        products=matched_products,
                        order_status=matched_order,
                        quick_suggestions=quick_suggestions or ["Explore Casual Shirts", "Track Order", "Return Policy"]
                    )
            except Exception as exc:
                log.warning(f"Gemini call fallback: {exc}")

        # Intelligent Fallback Response Formulation (Offline / Fast)
        reply_parts = []
        if matched_order:
            reply_parts.append(
                f"📦 **Order Status for #{matched_order.order_number}:**\n"
                f"Your order is currently **{matched_order.order_status.replace('_', ' ').title()}** with **{matched_order.carrier_name}**.\n"
                f"• **Tracking Number:** `{matched_order.tracking_number}`\n"
                f"• **Estimated Delivery:** {matched_order.shipping_eta}\n"
                f"• **Total Amount:** ₹{matched_order.total:.2f} ({matched_order.payment_status})"
            )
        elif is_order_query and not order_match:
            reply_parts.append(
                "Aapka order track karne ke liye please apna **Order Number** (jaise `ORD-2026-9021`) yahan share karein. "
                "Main turant live carrier tracking aur delivery ETA check karke bata dunga!"
            )
        elif matched_products:
            matched_budget = [p for p in matched_products if max_price and p.price <= max_price]
            if max_price and matched_budget:
                reply_parts.append(
                    f"Aapke **₹{int(max_price)}** budget ke andar humne best options dhundh liye hain! "
                    f"Niche diye gaye cards me aap photos, real price (₹), aur available sizes check kar sakte hain:"
                )
            elif max_price and not matched_budget:
                min_avail = min(p.price for p in matched_products)
                reply_parts.append(
                    f"Filhaal ₹{int(max_price)} ke andar direct match nahi mila, lekin sabse affordable best quality option "
                    f"**₹{int(min_avail)}** se available hai. Niche aap closest recommendations dekh sakte hain:"
                )
            else:
                reply_parts.append(
                    "Aapki pasand ke hisaab se humne top recommendations dhundhi hain! Niche diye gaye cards me aap photos, "
                    "real price (₹), aur available sizes check kar sakte hain:"
                )
        elif is_policy_query:
            policy_text = execute_get_store_policy(msg_lower)
            reply_parts.append(
                f"ℹ️ **TradeExpress Policy:**\n{policy_text}\n\nAgar aapko iske alawa koi specific help chahiye toh batayein!"
            )
        else:
            reply_parts.append(
                f"Namaste! Main **TradeExpress AI Assistant** hoon. Main aapki shopping, order tracking, "
                f"aur product search me help kar sakta hoon.\n\nAap mujhse kisi bhi product ka naam, budget, "
                f"ya apna Order ID pooch sakte hain!"
            )
            quick_suggestions = ["📦 Track an Order", "👕 Black Shirts under ₹1000", "🔄 7-Day Return Policy", "💼 Wholesale Bulk Rates"]

        return ChatResponse(
            session_id=session_id,
            reply="\n\n".join(reply_parts),
            products=matched_products,
            order_status=matched_order,
            quick_suggestions=quick_suggestions
        )

    async def _call_gemini(
        self,
        prompt: str,
        products: List[ProductCardItem],
        order: Optional[OrderTrackingResult]
    ) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"
        context_data = ""
        if products:
            context_data += "\nAvailable catalog matches for query:\n" + "\n".join(
                f"- {p.name} (SKU: {p.sku}, Price: ₹{p.price}, Stock: {p.stock})" for p in products
            )
        if order:
            context_data += (
                f"\nLive order details:\n- Order #{order.order_number}: Status {order.order_status}, "
                f"Carrier: {order.carrier_name}, ETA: {order.shipping_eta}, Total: ₹{order.total}"
            )

        body = {
            "systemInstruction": {"parts": [{"text": CHATBOT_SYSTEM_PROMPT + context_data}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 600}
        }
        res = await self.client.post(url, json=body, headers={"x-goog-api-key": self.api_key})
        if res.status_code == 200:
            data = res.json()
            candidates = data.get("candidates", [])
            if candidates:
                return "".join(p.get("text", "") for p in candidates[0].get("content", {}).get("parts", []))
        return ""
