import os
import re

_client = None


def _get_client():
    global _client
    try:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return None
        if _client is None:
            from groq import Groq
            _client = Groq(api_key=api_key)
        return _client
    except Exception:
        return None


def _fallback_agri_response(user_query: str) -> str:
    query = str(user_query or "").lower().strip()

    if re.search(r"\b(hello|hi|hey|greetings|namaste|morning|evening)\b", query):
        return (
            "Hello! 🌾 Welcome to Smart Agriculture Assistant. I am your AI farming assistant.\n\n"
            "How can I help you today with crop recommendations, soil NPK analysis, fertilizer dosage, plant disease diagnosis, or market prices?"
        )

    if re.search(r"\b(tomato|potato|onion|chilli|pepper|brinjal|eggplant|cabbage|cauliflower|vegetable)\b", query):
        return (
            "### Vegetable Crop Advisory\n\n"
            "* **Tomato / Solanaceous Crops**: Requires well-drained loamy soil with pH 6.0-7.0. Apply N:P:K ~100:60:60 kg/ha. Protect against Late Blight using Mancozeb (2g/L).\n"
            "* **Potato**: Thrives in cool weather (15-20°C) with loose, friable soil. Apply earthing up at 30 days post-planting to prevent tuber greening.\n"
            "* **Onion & Garlic**: Require sulfur-fortified soil for pungency and bulb development. Apply Ammonium Sulfate or Single Super Phosphate (SSP).\n\n"
            "Tip: Check leaf images in our Disease Detection section if you notice yellowing or dark spots!"
        )

    if re.search(r"\b(rice|paddy|wheat|maize|corn|sugarcane|cotton|pulse|gram|chickpea|soybean)\b", query):
        return (
            "### Major Field Crop Advisory\n\n"
            "* **Rice / Paddy**: Requires clayey/loamy soil, standing water during tillering, N:P:K 120:60:60. Watch for Bacterial Leaf Blight and Stem Borer.\n"
            "* **Wheat**: Prefers well-drained loamy soil, cool growth period (15-22°C), crown root initiation (CRI) irrigation at 21 days.\n"
            "* **Maize / Corn**: High nitrogen consumer. Split Nitrogen application into 3 doses (basal, knee-high, and flowering stage).\n"
            "* **Cotton**: Needs black regur soil, warm temperature (21-30°C), and Pink Bollworm control using pheromone traps.\n\n"
            "Tip: Try our Crop Recommendation tool on the sidebar to get AI-matched crop suggestions for your soil!"
        )

    if re.search(r"\b(fertilizer|urea|dap|mop|npk|nitrogen|potassium|phosphorus|zinc|sulfur|compost|manure|organic)\b", query):
        return (
            "### Fertilizer & Soil Nutrition Guidance\n\n"
            "* **Nitrogen (N)**: Promotes leafy green growth. Deficiency causes pale yellowing of bottom leaves. Remedy: Apply Urea (46% N) or Neem Coated Urea.\n"
            "* **Phosphorus (P)**: Essential for root setup & flowering. Deficiency causes purplish leaf edges. Remedy: Apply DAP (18-46-0) or SSP.\n"
            "* **Potassium (K)**: Increases disease resistance and grain filling. Remedy: Apply Muriate of Potash (MOP - 60% K2O).\n"
            "* **Micronutrients (Zinc/Boron)**: Apply Zinc Sulfate (25 kg/ha) if leaves show interveinal chlorosis.\n\n"
            "Tip: Visit our Fertilizer Advisor section to upload your soil lab report!"
        )

    if re.search(r"\b(disease|pest|fungus|blight|rust|yellow|spot|insects|worm|aphid|whitefly|wilt|mildew|leaf)\b", query):
        return (
            "### Pest & Plant Disease Management\n\n"
            "1. **Fungal Blights & Rusts**: Spray Copper Oxychloride (0.2%) or Mancozeb (2g/L). Avoid overhead sprinkler watering.\n"
            "2. **Sucking Pests (Aphids, Thrips, Whiteflies)**: Spray Neem Oil (5ml/L water) or Imidacloprid 17.8 SL (0.5ml/L) early morning.\n"
            "3. **Soil-borne Wilts / Root Rot**: Drench soil with Trichoderma viride or Carbendazim (1g/L).\n\n"
            "Tip: Upload a leaf photo to our Disease Detection page for instant AI diagnosis!"
        )

    if re.search(r"\b(weather|rain|water|irrigation|temperature|monsoon|drip|sprinkler)\b", query):
        return (
            "### Weather & Water Management Advisory\n\n"
            "* **Drip Irrigation**: Recommended for cotton, sugarcane, and fruit orchards to save 40-60% water.\n"
            "* **Drainage**: Ensure proper ridge-and-furrow drainage during heavy monsoon rains to prevent root rot.\n"
            "* **Irrigation Timing**: Irrigate early morning or evening to minimize evaporation losses."
        )

    if re.search(r"\b(market|price|mandi|rate|sell|cost|msp|profit)\b", query):
        return (
            "### Market Intelligence & Selling Strategy\n\n"
            "* **Mandi Price Monitoring**: Compare daily market rates across nearby mandis before selling harvest.\n"
            "* **Minimum Support Price (MSP)**: Register on government portals (e-NAM) to secure fair pricing.\n"
            "* **Storage**: Utilize cold storage or e-NWR warehouse receipts to hold produce during market gluts.\n\n"
            "Tip: Explore our Market Intelligence page for daily crop prices and regional trends!"
        )

    return (
        "### Smart Agriculture Assistant Advisory\n\n"
        f"Regarding your query on **'{user_query}'**:\n\n"
        "1. **Soil & Nutrition**: Test soil N-P-K and pH balance prior to sowing.\n"
        "2. **Crop Care**: Maintain proper crop rotation and integrated pest management (IPM).\n"
        "3. **Water & Weather**: Adjust irrigation based on local weather forecasts and growth stages.\n\n"
        "Feel free to ask about specific crops, fertilizer calculation, plant symptoms, or Mandi rates!"
    )


def get_chat_response(messages: list[dict]) -> str:
    user_query = ""
    try:
        if isinstance(messages, list):
            for msg in reversed(messages):
                if isinstance(msg, dict) and msg.get("role") == "user":
                    user_query = msg.get("content", "")
                    break
    except Exception:
        pass

    try:
        client = _get_client()
        if client:
            for model_name in ["llama-3.3-70b-versatile", "llama3-8b-8192", "mixtral-8x7b-32768"]:
                try:
                    response = client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        max_tokens=400,
                    )
                    return response.choices[0].message.content
                except Exception:
                    continue
    except Exception as e:
        print(f"Groq LLM error: {e}")

    return _fallback_agri_response(user_query)