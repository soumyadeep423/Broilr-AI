import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from auth import signup, login
from pymongo import MongoClient

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.0-flash")

def chat_with_gemini(prompt, history=[]):   
    convo = model.start_chat(history=history)
    convo.send_message(prompt)
    response_text = convo.last.text.strip()

    if response_text.startswith("```json"):
        response_text = response_text.replace("```json", "").strip("` \n")
    elif response_text.startswith("```"):
        response_text = response_text.replace("```", "").strip("` \n")

    cleaned_history = [
        {
            "role": h.role,
            "parts": [str(p.text) if hasattr(p, "text") else str(p) for p in h.parts]
        }
        for h in convo.history
    ]

    return response_text, cleaned_history

def ask_gemini_about_step(question, step, history):
    prompt = f"""
            You are a helpful cooking assistant. A user is currently at the following step:

            Step Instruction: {step['instruction']}
            Key Ingredients/Tools: {', '.join(step['key_ingredients_or_tools'])}

            They asked: "{question}"

            Answer concisely and clearly.
            """
    response_text, updated_history = chat_with_gemini(prompt, history)
    return response_text, updated_history


def generate_followup_questions(dish_name):
    prompt = f"""
            You are a smart cooking assistant. A user wants to cook "{dish_name}".

            Ask only a few follow-up questions that will help personalize the recipe.
            You can ask about ingredients they have, allergies, spice preference, skill level, etc.

            Return ONLY valid JSON like this (no code block):
            {{
            "dish": "{dish_name}",
            "questions": [
                "Do you have fresh tomatoes or canned?",
                "Do you prefer spicy or mild?",
                "Any ingredients you want to avoid?"
            ]
            }}
            """
    response, _ = chat_with_gemini(prompt)
    print("\n🧠 Gemini follow-up response:\n", response) 

    try:
        data = json.loads(response)
        return data.get("questions", [])
    except Exception as e:
        print(f"\n❌ Error parsing follow-up questions: {e}")
        return []


def generate_structured_recipe(dish_name, answers_dict):
    context = "\n".join([f"- {q} {a}" for q, a in answers_dict.items()])
    prompt = f"""
            Based on the user's answers below, generate a complete recipe for "{dish_name}".

            User Context:
            {context}

            Return ONLY a structured JSON (no code block), like:
            {{
            "recipe_name": "{dish_name}",
            "ingredients": [
                {{ "name": "Butter", "quantity": "2 tbsp" }},
                {{ "name": "Paneer", "quantity": "200g" }}
            ],
            "steps": [
                {{
                "step_number": 1,
                "instruction": "Heat 2 tbsp butter in a pan.",
                "estimated_time": 2,
                "key_ingredients_or_tools": ["butter", "pan"]
                }},
                ...
            ]
            }}
            """
    response, _ = chat_with_gemini(prompt)
    print("\n🍳 Gemini recipe response:\n", response) 

    try:
        recipe_json = json.loads(response)
        return recipe_json
    except Exception as e:
        print("\n❌ Could not parse recipe JSON:", e)
        return None

def walk_through_recipe(recipe):
    print(f"\n🍽️ Let's start cooking: {recipe['recipe_name']}!\n")

    steps = recipe["steps"]
    current_step = 0
    history = []

    while current_step < len(steps):
        step = steps[current_step]
        print(f"\n👣 Step {step['step_number']}: {step['instruction']}")
        print(f"⏱️ Estimated Time: {step['estimated_time']} min")
        print(f"🧂 Ingredients/Tools: {', '.join(step['key_ingredients_or_tools'])}")

        while True:
            user_input = input("\n🔄 Type 'next' to continue, 'repeat', or ask a question: ").strip().lower()

            if user_input in ["next", "n"]:
                current_step += 1
                break
            elif user_input in ["repeat", "r"]:
                break
            elif user_input in ["exit", "stop"]:
                print("\n👋 Exiting cooking assistant. Bon appétit!")
                return
            else:
                print("🤖 Let me help with that...")
                answer, history = ask_gemini_about_step(user_input, step, history)
                print(f"\n💡 {answer}")

def authenticate_user():
    while True:
        choice = input("🔐 Do you want to login or signup? (login/signup): ").strip().lower()
        username = input("👤 Username: ")
        password = input("🔑 Password: ")

        if choice == "signup":
            success, msg = signup(username, password)
        elif choice == "login":
            success, msg = login(username, password)
        else:
            print("❗ Invalid choice.")
            continue

        print(msg)
        if success:
            return username

def load_saved_recipes(username):
    client = MongoClient(os.getenv("MONGO_URI"))
    db = client["robochef"]
    user = db.users.find_one({"username": username}, {"_id": 0, "recipes": 1})
    
    recipes = user.get("recipes", []) if user else []
    if not recipes:
        print("📭 No saved recipes found.")
        return None

    print("\n📚 Your Saved Recipes:")
    for idx, recipe in enumerate(recipes, 1):
        print(f"{idx}. {recipe.get('recipe_name', 'Unnamed Recipe')}")

    try:
        choice = int(input("\n🔢 Enter the number of the recipe to load (or 0 to cancel): "))
        if 1 <= choice <= len(recipes):
            return recipes[choice - 1]
        else:
            print("❌ Invalid choice.")
            return None
    except ValueError:
        print("❌ Please enter a valid number.")
        return None


if __name__ == "__main__":
    print("👨‍🍳 Welcome to RoboChef - Your AI Cooking Assistant\n")
    username = authenticate_user()
    print("\n📦 Would you like to:")
    print("1. Cook a new recipe")
    print("2. Load a saved recipe")
    choice = input("👉 Enter 1 or 2: ").strip()

    if choice == "2":
        loaded_recipe = load_saved_recipes(username)
        if loaded_recipe:
            start = input("\n🍳 Ready to start cooking this saved recipe? (yes/no): ").strip().lower()
            if start in ["yes", "y"]:
                walk_through_recipe(loaded_recipe)
            else:
                print("👋 Come back when you're ready to cook!")
        exit()

    dish = input("🍽️ What do you want to cook? ")

    followups = generate_followup_questions(dish)
    if not followups:
        print("\n❌ Gemini failed to generate follow-up questions.")
        exit()

    answers = {}
    print("\n🧾 Please answer the following questions:")
    for q in followups:
        a = input(f"👉 {q} ")
        answers[q] = a

    print("\n🔧 Generating your personalized recipe...")
    recipe = generate_structured_recipe(dish, answers)

    if recipe:
        print("\n✅ Recipe Generated Successfully!\n")
        print(json.dumps(recipe, indent=2))

        start = input("\n🍳 Ready to start cooking? (yes/no): ").strip().lower()
        if start in ["yes", "y"]:
            walk_through_recipe(recipe)
        else:
            print("👋 Come back when you're ready to cook!")

    else:
        print("\n❌ Failed to generate recipe. Please try again.")

    save = input("\n💾 Would you like to save this recipe? (yes/no): ").strip().lower()
    if save in ["yes", "y"]:
        client = MongoClient(os.getenv("MONGO_URI"))
        db = client["robochef"]
        db.users.update_one(
            {"username": username},
            {"$push": {"recipes": recipe}}
        )
        print("✅ Recipe saved to your profile.")
