// src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "https://broilr-ai.onrender.com/", // Flask server
});

export default api;
