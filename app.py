from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from auth import signup, login
from gemini import generate_followup_questions, generate_structured_recipe, ask_gemini_about_step
from pymongo import MongoClient

# Load .env variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend calls

client = MongoClient(os.getenv("MONGO_URI"))
db = client["robochef"]
users = db["users"]


# ------------------------
# Auth Routes
# ------------------------

@app.route("/signup", methods=["POST"])
def route_signup():
    data = request.json
    success, msg = signup(data["username"], data["password"])
    return jsonify({"success": success, "message": msg})


@app.route("/login", methods=["POST"])
def route_login():
    data = request.json
    success, msg = login(data["username"], data["password"])
    return jsonify({"success": success, "message": msg})


# ------------------------
# Recipe Generation
# ------------------------

@app.route("/followups", methods=["POST"])
def route_followups():
    data = request.json
    dish = data.get("dish")
    questions = generate_followup_questions(dish)
    return jsonify({"questions": questions})


@app.route("/generate_recipe", methods=["POST"])
def route_generate_recipe():
    data = request.json
    dish = data["dish"]
    answers = data["answers"]  # dictionary
    recipe = generate_structured_recipe(dish, answers)
    
    if data.get("username"):
        users.update_one(
            {"username": data["username"]},
            {"$push": {"recipes": recipe}}
        )

    return jsonify({"recipe": recipe})


@app.route("/ask_step", methods=["POST"])
def route_ask_step():
    data = request.json
    question = data["question"]
    step = data["step"]
    history = data.get("history", [])

    answer, updated_history = ask_gemini_about_step(question, step, history)
    return jsonify({
        "answer": answer,
        "history": updated_history  # Now guaranteed to be JSON serializable
    })



@app.route("/load_recipes", methods=["POST"])
def route_load_recipes():
    data = request.json
    username = data["username"]
    user = users.find_one({"username": username}, {"_id": 0, "recipes": 1})
    return jsonify({"recipes": user.get("recipes", [])})

@app.route("/save_recipe", methods=["POST"])
def save_recipe():
    data = request.json
    recipe = data["recipe"]
    username = data["username"]

    users.update_one(
        {"username": username},
        {"$push": {"recipes": recipe}}
    )

    return jsonify({"message": "✅ Recipe saved successfully!"})

@app.route("/delete_recipe", methods=["POST"])
def delete_recipe():
    data = request.get_json()
    username = data.get("username")
    recipe_name = data.get("recipe_name")

    if not username or not recipe_name:
        return jsonify({"success": False, "message": "Missing username or recipe name"}), 400

    result = db.users.update_one(
        {"username": username},
        {"$pull": {"recipes": {"recipe_name": recipe_name}}}
    )

    if result.modified_count == 0:
        return jsonify({"success": False, "message": "Recipe not found."}), 404

    return jsonify({"success": True, "message": "Recipe deleted."})


# ------------------------

if __name__ == "__main__":
    app.run(debug=True)
