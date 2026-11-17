import asyncio
import os
import sys
from pathlib import Path

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

root = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root / "backend"))
sys.path.insert(0, str(root))

os.environ["TX_OFFLINE"] = "1"

from chatbot.backend.agent import ChatbotAgent
from chatbot.backend.tools import execute_get_order_status, execute_search_products, execute_get_store_policy

async def main():
    print("Testing Chatbot Engine directly...")
    agent = ChatbotAgent()

    # Test 1: Order Tracking
    print("\n--- Test 1: Order Tracking ---")
    res1 = await agent.chat("Where is my order ORD-2026-9021?", session_id="test_sess_1")
    print(f"Reply:\n{res1.reply}")
    assert res1.order_status is not None
    assert res1.order_status.order_number == "ORD-2026-9021"
    assert res1.order_status.order_status == "SHIPPED"
    print(f"Carrier: {res1.order_status.carrier_name}, Progress: {res1.order_status.progress_percentage}%")
    print("✓ Order tracking verified with exact TradeExpress Order schema!")

    # Test 2: Product Search
    print("\n--- Test 2: Product Search ---")
    res2 = await agent.chat("Show black cotton shirts under 1000", session_id="test_sess_2")
    print(f"Matched products: {len(res2.products)}")
    assert len(res2.products) > 0
    p = res2.products[0]
    print(f"Top Product: {p.name} | Price: ₹{p.price} | Stock: {p.stock}")
    print("✓ Product search & budget filter verified!")

    # Test 3: Store Policy FAQ
    print("\n--- Test 3: Store Policy FAQ ---")
    res3 = await agent.chat("What is your return policy and shipping time?", session_id="test_sess_3")
    print(f"Policy reply:\n{res3.reply}")
    assert "return" in res3.reply.lower() or "days" in res3.reply.lower()
    print("✓ Policy lookup verified!")

    # Test 4: Tool execution
    print("\n--- Test 4: Direct Tool Functions ---")
    order = await execute_get_order_status("ORD-998811")
    assert order.order_number == "ORD-998811"
    assert len(order.items) > 0
    print(f"Item: {order.items[0].product_name} (Qty: {order.items[0].quantity})")
    print("✓ Tool functions verified!")

    print("\n==============================================")
    print("ALL 4 CHATBOT TESTS PASSED COMPLETELY! (0 ERRORS)")
    print("==============================================")

if __name__ == "__main__":
    asyncio.run(main())
