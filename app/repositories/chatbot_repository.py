import os
import re

_client = None


def _get_client():
    global _client
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return None
    if _client is None:
        try:
            from groq import Groq
            _client = Groq(api_key=api_key)
        except Exception:
            return None
    return _client


def _fallback_agri_response(user_query: str) -> str:
    query = user_query.lower()

    if re.search(r"\b(hello|hi|hey|greetings|namaste)\b", query):
        return (
            "Hello 🌾 Welcome to Smart Agriculture Assistant! I am your AI farming assistant. "
            "How can I help you today with crop recommendations, fertilizer advisory, disease identification, or market prices?"
        )

    if re.search(r"\b(crop|recommend|grow|plant|select)\b", query):
        return (
            "🌱 **Crop Recommendation Advisory**:\n\n"
            "• **Rice / Paddy**: Best in clayey/loamy soil with high rainfall (>150cm) and temperature 22–32°C.\n"
            "• **Wheat**: Thrives in well-drained loamy soil, cool climate (15–22°C), moderate water.\n"
            "• **Pulses (Chickpea, Pigeonpea)**: Require nitrogen-fixing soil, lower rainfall, N:P:K balance ~20:40:20.\n"
            "• **Cotton**: Prefers black cotton soil (Regur), high temperature (21–30°C), and 180 frost-free days.\n\n"
            "💡 *Tip: Use our **Crop Recommendation** tool on the dashboard to test your exact soil NPK values!*"
        )

    if re.search(r"\b(fertilizer|urea|dap|mop|npk|nitrogen|potassium|phosphorus)\b", query):
        return (
            "🧪 **Fertilizer & Soil Health Guidance**:\n\n"
            "• **Nitrogen Deficiency**: Causes yellowing of older leaves. Remedy: Apply Urea (46% N) or Ammonium Sulfate.\n"
            "• **Phosphorus Deficiency**: Causes purple-tinted leaves and stunted root growth. Remedy: Apply DAP or Single Super Phosphate (SSP).\n"
            "• **Potassium Deficiency**: Causes burnt leaf tips and weak stems. Remedy: Apply Muriate of Potash (MOP / 60% K2O).\n\n"
            "💡 *Tip: Visit our **Fertilizer Advisor** section to upload your soil lab card for exact dosage breakdown!*"
        )

    if re.search(r"\b(disease|pest|fungus|blight|rust|yellow|spot|insects|leaf)\b", query):
        return (
            "🛡️ **Crop Disease & Pest Control**:\n\n"
            "1. **Bacterial Leaf Blight**: Use Copper Oxychloride (0.2%) + Streptocycline (0.01%). Avoid excessive Nitrogen.\n"
            "2. **Powdery Mildew / Rust**: Spray Wettable Sulfur (0.2%) or Hexaconazole 5% EC.\n"
            "3. **Aphids & Whiteflies**: Spray Neem Oil (5ml/L) or Imidacloprid (0.5ml/L) in early morning.\n\n"
            "💡 *Tip: Take a picture of the affected leaf and upload it to our **Disease Detection** tool for instant image analysis!*"
        )

    if re.search(r"\b(weather|rain|water|irrigation|temperature|monsoon)\b", query):
        return (
            "🌧️ **Weather & Irrigation Management**:\n\n"
            "• Maintain proper field drainage during heavy rains to prevent root rot.\n"
            "• Use **Drip Irrigation** for sugarcane, cotton, and vegetables to save up to 50% water.\n"
            "• Apply irrigation during early morning or late evening to minimize evaporative loss."
        )

    if re.search(r"\b(market|price|mandi|rate|sell|cost)\b", query):
        return (
            "📊 **Market Intelligence Advisory**:\n\n"
            "• Monitor daily MSP (Minimum Support Price) and regional mandi price fluctuations before harvesting.\n"
            "• Store non-perishable grains in certified warehouses to sell during peak price windows.\n\n"
            "💡 *Tip: Check our **Market Intelligence** tab to view live Mandi price updates across commodities!*"
        )

    return (
        "🌾 **Smart Agriculture Assistant Advice**:\n\n"
        f"Regarding your query on *'{user_query}'*:\n"
        "1. Ensure balanced soil nutrition (N-P-K) tested every season.\n"
        "2. Monitor regional weather forecasts before pesticide application or irrigation.\n"
        "3. Rotate leguminous crops with cereals to maintain soil microbial health.\n\n"
        "Feel free to ask about specific crops, fertilizer ratios, or plant disease treatments!"
    )


def get_chat_response(messages: list[dict]) -> str:
    user_query = ""
    for msg in reversed(messages):
        if msg.get("role") == "user":
            user_query = msg.get("content", "")
            break

    client = _get_client()
    if client:
        try:
            response = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=messages,
                max_tokens=400,
            )
            return response.choices[0].message.content
        except Exception:
            pass

    return _fallback_agri_response(user_query)