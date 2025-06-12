# auth.py
import bcrypt
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
client = MongoClient(os.getenv("MONGO_URI"))
db = client["robochef"]
users = db["users"]

def signup(username, password):
    if users.find_one({"username": username}):
        return False, "Username already exists"
    hashed_pw = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    users.insert_one({"username": username, "password": hashed_pw, "preferences": {}, "recipes": []})
    return True, "Signup successful"

def login(username, password):
    user = users.find_one({"username": username})
    if not user:
        return False, "User not found"
    if bcrypt.checkpw(password.encode(), user["password"]):
        return True, "Login successful"
    return False, "Incorrect password"
